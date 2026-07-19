import { describe, expect, it, vi, beforeEach } from "vitest";

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

describe("data/relationship", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockOrder.mockReturnValue({ data: [], error: null });
    mockOr.mockReturnValue({ order: mockOrder });
    mockSelect.mockReturnValue({ or: mockOr });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("getMyRelationships selects relationships filtered by member", async () => {
    const rows = [
      {
        id: "r1",
        member_a: "u1",
        member_b: "u2",
        archetype: "getting_to_know",
        status: "active",
        created_at: "2026-01-01",
        paired_at: "2026-01-01",
      },
    ];
    mockOrder.mockReturnValue({ data: rows, error: null });

    const { getMyRelationships } = await import("~/lib/data/relationship");
    const result = await getMyRelationships();

    expect(mockFrom).toHaveBeenCalledWith("relationships");
    expect(mockOr).toHaveBeenCalledWith("member_a.eq.u1,member_b.eq.u1");
    expect(result).toEqual(rows);
  });

  it("getMyRelationships returns [] when no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { getMyRelationships } = await import("~/lib/data/relationship");
    expect(await getMyRelationships()).toEqual([]);
  });

  it("getMyRelationships throws on error", async () => {
    mockOrder.mockReturnValue({ data: null, error: { message: "boom" } });
    const { getMyRelationships } = await import("~/lib/data/relationship");
    await expect(getMyRelationships()).rejects.toBeTruthy();
  });

  it("getMyActiveRelationship returns first active", async () => {
    mockOrder.mockReturnValue({
      data: [
        { id: "r1", status: "archived" },
        { id: "r2", status: "active" },
      ],
      error: null,
    });
    const { getMyActiveRelationship } = await import("~/lib/data/relationship");
    const result = await getMyActiveRelationship();
    expect(result?.id).toBe("r2");
  });

  it("createPairInvite calls the RPC with archetype and returns code", async () => {
    mockRpc.mockResolvedValue({ data: "ABCD1234", error: null });
    const { createPairInvite } = await import("~/lib/data/relationship");
    const code = await createPairInvite("established_couple");
    expect(mockRpc).toHaveBeenCalledWith("create_pair_invite", {
      p_archetype: "established_couple",
    });
    expect(code).toBe("ABCD1234");
  });

  it("redeemPairCode calls the RPC with code and returns relationship id", async () => {
    mockRpc.mockResolvedValue({ data: "rel-99", error: null });
    const { redeemPairCode } = await import("~/lib/data/relationship");
    const id = await redeemPairCode("ABCD1234");
    expect(mockRpc).toHaveBeenCalledWith("redeem_pair_code", {
      p_code: "ABCD1234",
    });
    expect(id).toBe("rel-99");
  });

  it("redeemPairCode throws the RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("code expired") });
    const { redeemPairCode } = await import("~/lib/data/relationship");
    await expect(redeemPairCode("X")).rejects.toThrow("code expired");
  });

  it("revokePairInvite calls the RPC with code", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { revokePairInvite } = await import("~/lib/data/relationship");
    await revokePairInvite("ABCD1234");
    expect(mockRpc).toHaveBeenCalledWith("revoke_pair_invite", {
      p_code: "ABCD1234",
    });
  });
});
