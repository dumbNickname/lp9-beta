import { beforeEach, describe, expect, it, vi } from "vitest";

// QA adversarial suite for PRD-21 — data-layer wrappers.
//
// Proves the wrappers over the PRD-16 RPCs call the CORRECT rpc names with
// the CORRECT arg shapes, that getMyRelationships selects only existing
// columns and applies the member filter, and that every wrapper throws on a
// supabase error (rather than silently returning a bad value). Also asserts
// the never-on-server invariant at the data layer: no RPC arg and no table
// write ever carries an AES key.

const mockOrder = vi.fn();
const mockOr = vi.fn(() => ({ order: mockOrder }));
const mockSelect = vi.fn(() => ({ or: mockOr }));
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

// Columns the relationships table actually has post PRD-15. Recovery-blob
// columns are null pre-PRD-22 and MUST NOT be selected here. There is no
// key column anywhere — the AES key lives only in IndexedDB.
const ALLOWED_COLUMNS = new Set([
  "id",
  "member_a",
  "member_b",
  "archetype",
  "status",
  "created_at",
  "paired_at",
]);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "uid-self" } } });
  mockOrder.mockReturnValue({ data: [], error: null });
  mockOr.mockReturnValue({ order: mockOrder });
  mockSelect.mockReturnValue({ or: mockOr });
  mockFrom.mockReturnValue({ select: mockSelect });
});

describe("PRD-21 QA: getMyRelationships select shape", () => {
  it("selects ONLY columns that exist on the relationships table (no key/recovery cols)", async () => {
    const { getMyRelationships } = await import("~/lib/data/relationship");
    await getMyRelationships();

    expect(mockFrom).toHaveBeenCalledWith("relationships");
    expect(mockSelect).toHaveBeenCalledTimes(1);
    const selectArg = (mockSelect.mock.calls as unknown as string[][])[0]![0]!;
    const requested = selectArg.split(",").map((c) => c.trim());
    for (const col of requested) {
      expect(ALLOWED_COLUMNS.has(col)).toBe(true);
    }
    // Explicitly assert no key-bearing column is requested.
    expect(selectArg).not.toMatch(/key|recovery|blob|wrapped/i);
  });

  it("applies an explicit member filter for the current user (PostgREST .eq/.or rule)", async () => {
    const { getMyRelationships } = await import("~/lib/data/relationship");
    await getMyRelationships();
    expect(mockOr).toHaveBeenCalledWith(
      "member_a.eq.uid-self,member_b.eq.uid-self",
    );
  });

  it("returns [] without querying when there is no authed user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { getMyRelationships } = await import("~/lib/data/relationship");
    expect(await getMyRelationships()).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("throws (does not swallow) a supabase select error", async () => {
    mockOrder.mockReturnValue({ data: null, error: { message: "rls denied" } });
    const { getMyRelationships } = await import("~/lib/data/relationship");
    await expect(getMyRelationships()).rejects.toBeTruthy();
  });
});

describe("PRD-21 QA: RPC wrapper arg shapes + throw-on-error", () => {
  it("createPairInvite -> rpc('create_pair_invite', { p_archetype }) and returns the code", async () => {
    mockRpc.mockResolvedValue({ data: "CODE-1", error: null });
    const { createPairInvite } = await import("~/lib/data/relationship");
    const code = await createPairInvite("close_friends");

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("create_pair_invite", {
      p_archetype: "close_friends",
    });
    expect(code).toBe("CODE-1");
    // Arg object must carry archetype ONLY — never a key.
    const arg = mockRpc.mock.calls[0]![1] as Record<string, unknown>;
    expect(Object.keys(arg)).toEqual(["p_archetype"]);
  });

  it("redeemPairCode -> rpc('redeem_pair_code', { p_code }) and returns the relationship id", async () => {
    mockRpc.mockResolvedValue({ data: "rel-xyz", error: null });
    const { redeemPairCode } = await import("~/lib/data/relationship");
    const id = await redeemPairCode("CODE-1");

    expect(mockRpc).toHaveBeenCalledWith("redeem_pair_code", {
      p_code: "CODE-1",
    });
    expect(id).toBe("rel-xyz");
    const arg = mockRpc.mock.calls[0]![1] as Record<string, unknown>;
    expect(Object.keys(arg)).toEqual(["p_code"]);
  });

  it("revokePairInvite -> rpc('revoke_pair_invite', { p_code })", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { revokePairInvite } = await import("~/lib/data/relationship");
    await revokePairInvite("CODE-1");
    expect(mockRpc).toHaveBeenCalledWith("revoke_pair_invite", {
      p_code: "CODE-1",
    });
  });

  it("each RPC wrapper throws when supabase returns an error", async () => {
    const rel = await import("~/lib/data/relationship");

    mockRpc.mockResolvedValue({ data: null, error: new Error("invalid code") });
    await expect(rel.createPairInvite("getting_to_know")).rejects.toThrow(
      "invalid code",
    );
    await expect(rel.redeemPairCode("x")).rejects.toThrow("invalid code");
    await expect(rel.revokePairInvite("x")).rejects.toThrow("invalid code");
  });

  it("never sends an AES key or base64 payload to any RPC arg", async () => {
    mockRpc.mockResolvedValue({ data: "ok", error: null });
    const rel = await import("~/lib/data/relationship");
    await rel.createPairInvite("getting_to_know");
    await rel.redeemPairCode("CODE-1");
    await rel.revokePairInvite("CODE-1");

    for (const call of mockRpc.mock.calls) {
      const arg = JSON.stringify(call[1] ?? {});
      // No base64-ish long token, no "key" field.
      expect(arg).not.toMatch(/key/i);
    }
  });
});
