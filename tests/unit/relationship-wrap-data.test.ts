import { describe, expect, it, vi, beforeEach } from "vitest";

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));
const mockRpc = vi.fn();

vi.mock("~/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
    auth: { getUser: vi.fn() },
  },
  getSupabase: vi.fn(),
}));

describe("data/relationship recovery wrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("getRelationshipWrap selects wrap columns filtered by id", async () => {
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
    const result = await getRelationshipWrap("rel-1");

    expect(mockFrom).toHaveBeenCalledWith("relationships");
    expect(mockSelect).toHaveBeenCalledWith(
      "wrapped_key_blob, wrap_salt, wrap_iterations, wrap_algo",
    );
    expect(mockEq).toHaveBeenCalledWith("id", "rel-1");
    expect(Array.from(result!.wrapped_key_blob)).toEqual([0x0a, 0x1b]);
    expect(Array.from(result!.wrap_salt)).toEqual([0xff, 0x00]);
    expect(result!.wrap_iterations).toBe(600000);
    expect(result!.wrap_algo).toBe("PBKDF2-SHA256");
  });

  it("getRelationshipWrap returns null when no password set", async () => {
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
    expect(await getRelationshipWrap("rel-1")).toBeNull();
  });

  it("getRelationshipWrap throws on error", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: new Error("boom") });
    const { getRelationshipWrap } = await import("~/lib/data/relationship");
    await expect(getRelationshipWrap("rel-1")).rejects.toThrow("boom");
  });

  it("setRecoveryPassword calls the RPC with hex-encoded bytea args", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { setRecoveryPassword } = await import("~/lib/data/relationship");

    await setRecoveryPassword(
      "rel-1",
      new Uint8Array([0x0a, 0x1b]),
      new Uint8Array([0xff, 0x00]),
      600000,
      "PBKDF2-SHA256",
    );

    expect(mockRpc).toHaveBeenCalledWith("set_recovery_password", {
      p_rel_id: "rel-1",
      p_wrapped_blob: "\\x0a1b",
      p_salt: "\\xff00",
      p_iterations: 600000,
      p_algo: "PBKDF2-SHA256",
    });
  });

  it("setRecoveryPassword throws the RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("not a relationship member") });
    const { setRecoveryPassword } = await import("~/lib/data/relationship");
    await expect(
      setRecoveryPassword("rel-1", new Uint8Array([1]), new Uint8Array([2]), 600000, "PBKDF2-SHA256"),
    ).rejects.toThrow("not a relationship member");
  });
});
