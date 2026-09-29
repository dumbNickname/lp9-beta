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
  chain.order = vi.fn(() => Promise.resolve({ data: [{ id: "c1" }], error: null }));
  mockRpc.mockResolvedValue({ data: "c-new", error: null });
});

describe("data/coupons", () => {
  it("listCoupons filters by relationship", async () => {
    const { listCoupons } = await import("~/lib/data/coupons");
    expect(await listCoupons("r1")).toEqual([{ id: "c1" }]);
    expect(mockFrom).toHaveBeenCalledWith("coupons");
    expect(chain.eq).toHaveBeenCalledWith("relationship_id", "r1");
  });

  it("submitCoupon maps fields and template key", async () => {
    const { submitCoupon } = await import("~/lib/data/coupons");
    const id = await submitCoupon("r1", { title: "Breakfast in bed", price: 8, emoji: "x" }, "etc_breakfast");
    expect(id).toBe("c-new");
    expect(mockRpc).toHaveBeenCalledWith("submit_coupon", {
      p_rel_id: "r1",
      p_title: "Breakfast in bed",
      p_description: null,
      p_boundaries: null,
      p_emoji: "x",
      p_price: 8,
      p_template_key: "etc_breakfast",
    });
  });

  it("status RPCs", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const m = await import("~/lib/data/coupons");
    await m.approveCoupon("c1");
    await m.declineCoupon("c1", "not now");
    await m.retireCoupon("c1");
    await m.deleteCoupon("c1");
    await m.updateCouponDraft("c1", { title: "t", price: 2 });
    expect(mockRpc.mock.calls.map((c) => c[0])).toEqual([
      "approve_coupon",
      "decline_coupon",
      "retire_coupon",
      "delete_coupon",
      "update_coupon_draft",
    ]);
    expect(mockRpc.mock.calls[1]![1]).toEqual({ p_coupon_id: "c1", p_note: "not now" });
  });

  it("errors propagate + friendly mapping", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "invalid price" } });
    const m = await import("~/lib/data/coupons");
    await expect(m.approveCoupon("c1")).rejects.toMatchObject({ message: "invalid price" });
    expect(m.friendlyCouponError({ message: "invalid price" })).toMatch(/1 and 50/);
    expect(m.friendlyCouponError("x")).toMatch(/Something went wrong/);
  });
});
