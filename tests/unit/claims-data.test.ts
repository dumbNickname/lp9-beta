import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRpc = vi.fn();
const chain: Record<string, ReturnType<typeof vi.fn>> = {};
const mockFrom = vi.fn(() => chain);

vi.mock("~/lib/supabase", () => ({
  supabase: { from: mockFrom, rpc: mockRpc, auth: { getUser: vi.fn() } },
  getSupabase: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => Promise.resolve({ data: [{ id: "k1" }], error: null }));
  mockRpc.mockResolvedValue({ data: null, error: null });
});

describe("data/claims", () => {
  it("listClaims filters by relationship", async () => {
    const { listClaims } = await import("~/lib/data/claims");
    expect(await listClaims("r1")).toEqual([{ id: "k1" }]);
    expect(mockFrom).toHaveBeenCalledWith("coupon_claims");
    expect(chain.eq).toHaveBeenCalledWith("relationship_id", "r1");
  });

  it("RPC names + args", async () => {
    const m = await import("~/lib/data/claims");
    mockRpc.mockResolvedValueOnce({ data: "k-new", error: null });
    expect(await m.claimCoupon("c1")).toBe("k-new");
    mockRpc.mockResolvedValueOnce({ data: 2, error: null });
    expect(await m.sweepExpiredClaims("r1")).toBe(2);
    await m.acceptClaim("k1", "2026-10-03", "Saturday?");
    await m.declineClaim("k1", null);
    await m.deliverClaim("k1");
    await m.withdrawClaim("k1");
    await m.cancelClaim("k1", "sick");
    await m.nudgeClaim("k1");
    expect(mockRpc.mock.calls.map((c) => c[0])).toEqual([
      "claim_coupon",
      "sweep_expired_claims",
      "accept_claim",
      "decline_claim",
      "deliver_claim",
      "withdraw_claim",
      "cancel_claim",
      "nudge_claim",
    ]);
    expect(mockRpc.mock.calls[2]![1]).toEqual({ p_claim_id: "k1", p_date: "2026-10-03", p_note: "Saturday?" });
  });

  it("friendly errors", async () => {
    const { friendlyClaimError } = await import("~/lib/data/claims");
    expect(friendlyClaimError({ message: "not enough hearts" })).toMatch(/enough hearts/);
    expect(friendlyClaimError("zzz")).toMatch(/Something went wrong/);
  });
});
