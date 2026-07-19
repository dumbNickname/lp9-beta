import { beforeEach, describe, expect, it, vi } from "vitest";

// QA adversarial suite for PRD-22 data layer. Proves the server never sees
// the plaintext key or password (only blob + salt + iterations + algo),
// the bytea hex helpers round-trip arbitrary bytes including 0x00 / 0xff /
// high bytes and tolerate the documented `\x` shapes, and getRelationshipWrap
// returns null cleanly when no password has been set.
//
// The supabase client is mocked; we inspect every recorded call arg.

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockRpc = vi.fn();
const mockGetUser = vi.fn();

vi.mock("~/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
    auth: { getUser: mockGetUser },
  },
  getSupabase: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
});

// Deep-stringify every arg passed to the RPC, so any accidental inclusion
// of a secret string (raw key bytes, password) surfaces.
function serializeCalls(calls: unknown[][]): string {
  return calls
    .map((args) =>
      args
        .map((a) => {
          if (a instanceof Uint8Array) return Array.from(a).join(",");
          if (typeof a === "object" && a !== null) {
            return JSON.stringify(a, (_k, v) =>
              v instanceof Uint8Array ? Array.from(v) : v,
            );
          }
          return String(a);
        })
        .join("|"),
    )
    .join("\n");
}

describe("PRD-22 QA: server never sees the raw key or the password", () => {
  it("set_recovery_password payload contains only rel_id + blob + salt + iterations + algo", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { setRecoveryPassword } = await import("~/lib/data/relationship");

    // High-entropy sentinel strings that MUST NOT appear anywhere on the wire.
    const SECRET_PASSWORD = "S3cr3t-Passw0rd-9f3a7c1e-do-not-leak";
    const rawKeyBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    // Blob/salt are the ONLY bytea the wire should carry.
    const blob = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const salt = new Uint8Array([0x00, 0xff, 0x10]);

    await setRecoveryPassword("rel-x", blob, salt, 600000, "PBKDF2-SHA256");

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [name, args] = mockRpc.mock.calls[0]!;
    expect(name).toBe("set_recovery_password");

    // Exactly the five expected keys, nothing more.
    expect(Object.keys(args as object).sort()).toEqual(
      ["p_algo", "p_iterations", "p_rel_id", "p_salt", "p_wrapped_blob"].sort(),
    );

    const wire = serializeCalls(mockRpc.mock.calls);
    // Password sentinel must be absent.
    expect(wire).not.toContain(SECRET_PASSWORD);
    // Raw relationship key bytes must be absent (we never passed them, and
    // the fn signature has no place for them -- this guards regressions).
    expect(wire).not.toContain(Array.from(rawKeyBytes).join(","));

    // The blob/salt that DO cross the wire are the encoded ciphertext, hex form.
    expect(args).toMatchObject({
      p_rel_id: "rel-x",
      p_wrapped_blob: "\\xdeadbeef",
      p_salt: "\\x00ff10",
      p_iterations: 600000,
      p_algo: "PBKDF2-SHA256",
    });
  });

  it("getRelationshipWrap SELECT lists only the four wrap columns", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        wrapped_key_blob: "\\x0a1b",
        wrap_salt: "\\xff00",
        wrap_iterations: 600000,
        wrap_algo: "PBKDF2-SHA256",
      },
      error: null,
    });
    const { getRelationshipWrap } = await import("~/lib/data/relationship");
    await getRelationshipWrap("rel-1");

    // Must not select member ids or any plaintext-key-adjacent column.
    const selectArg = (mockSelect.mock.calls[0] as unknown[])[0] as string;
    expect(selectArg).toBe("wrapped_key_blob, wrap_salt, wrap_iterations, wrap_algo");
    expect(selectArg).not.toMatch(/member_a|member_b|\*/);
  });
});

describe("PRD-22 QA: bytea hex helpers round-trip arbitrary bytes", () => {
  // The helpers are module-private; we exercise them through the public
  // set/get boundary. setRecoveryPassword encodes bytes -> \x hex, and
  // getRelationshipWrap decodes \x hex -> bytes. A set-then-get with the
  // SAME hex string must recover the original bytes exactly.
  it("0x00, 0xff and high bytes survive encode (set) then decode (get)", async () => {
    const original = new Uint8Array([
      0x00, 0xff, 0x7f, 0x80, 0x01, 0xfe, 0xa5, 0x5a, 0x00, 0x00, 0xff, 0xff,
    ]);

    mockRpc.mockResolvedValue({ data: null, error: null });
    const rel = await import("~/lib/data/relationship");
    await rel.setRecoveryPassword("rel-z", original, original, 600000, "PBKDF2-SHA256");

    // Grab the hex the encoder produced for the blob.
    const args = mockRpc.mock.calls[0]![1] as { p_wrapped_blob: string };
    const encodedHex = args.p_wrapped_blob;
    expect(encodedHex).toBe("\\x00ff7f8001fea55a0000ffff");

    // Feed that exact hex back through the decoder (as PostgREST would echo it).
    mockMaybeSingle.mockResolvedValue({
      data: {
        wrapped_key_blob: encodedHex,
        wrap_salt: encodedHex,
        wrap_iterations: 600000,
        wrap_algo: "PBKDF2-SHA256",
      },
      error: null,
    });
    const wrap = await rel.getRelationshipWrap("rel-z");
    expect(Array.from(wrap!.wrapped_key_blob)).toEqual(Array.from(original));
    expect(Array.from(wrap!.wrap_salt)).toEqual(Array.from(original));
  });

  it("decoder tolerates a Uint8Array shape (driver variation)", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        wrapped_key_blob: new Uint8Array([0xaa, 0xbb]),
        wrap_salt: new Uint8Array([0x01]),
        wrap_iterations: 600000,
        wrap_algo: "PBKDF2-SHA256",
      },
      error: null,
    });
    const { getRelationshipWrap } = await import("~/lib/data/relationship");
    const wrap = await getRelationshipWrap("rel-1");
    expect(Array.from(wrap!.wrapped_key_blob)).toEqual([0xaa, 0xbb]);
  });

  it("decoder tolerates a numeric-array shape (driver variation)", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        wrapped_key_blob: [0x10, 0x20, 0x30],
        wrap_salt: [0x00],
        wrap_iterations: 600000,
        wrap_algo: "PBKDF2-SHA256",
      },
      error: null,
    });
    const { getRelationshipWrap } = await import("~/lib/data/relationship");
    const wrap = await getRelationshipWrap("rel-1");
    expect(Array.from(wrap!.wrapped_key_blob)).toEqual([0x10, 0x20, 0x30]);
  });
});

describe("PRD-22 QA: getRelationshipWrap null when no password set", () => {
  it("returns null (not a throw) when the wrap columns are all null", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        wrapped_key_blob: null,
        wrap_salt: null,
        wrap_iterations: null,
        wrap_algo: null,
      },
      error: null,
    });
    const { getRelationshipWrap } = await import("~/lib/data/relationship");
    expect(await getRelationshipWrap("rel-none")).toBeNull();
  });

  it("returns null when the row itself is absent", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const { getRelationshipWrap } = await import("~/lib/data/relationship");
    expect(await getRelationshipWrap("rel-missing")).toBeNull();
  });
});
