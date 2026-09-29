import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("~/lib/supabase", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: { getUser: vi.fn() } },
  getSupabase: vi.fn(),
}));
vi.mock("~/lib/data/profile", () => ({ getDisplayName: () => Promise.resolve("Bob") }));
vi.mock("~/lib/stores/points", () => ({
  hasCommentKey: () => true,
  mySpendable: () => 7,
  refreshPoints: vi.fn(),
  usePointsFocusRefresh: vi.fn(),
  feed: () => [],
  pointsLoading: () => false,
  pointsError: () => false,
  giveHearts: vi.fn(),
  editHeartComment: vi.fn(),
  undoHearts: vi.fn(),
}));
vi.mock("~/lib/stores/coupons", () => ({
  coupons: () => [],
  couponsLoading: () => false,
  couponsError: () => false,
  refreshCoupons: vi.fn(),
  refreshCurrentCoupons: vi.fn(),
  addCoupon: vi.fn(),
  editCoupon: vi.fn(),
  removeCoupon: vi.fn(),
  approve: vi.fn(),
  decline: vi.fn(),
  retire: vi.fn(),
}));

afterEach(() => {
  cleanup();
  history.replaceState(null, "", "/");
});

const rel = {
  id: "r1",
  member_a: "me",
  member_b: "bob",
  archetype: "established_couple" as const,
  status: "active" as const,
  created_at: "",
  paired_at: "",
};

describe("Dashboard tabs", () => {
  it("defaults to Notes, switches to Coupons and syncs hash", async () => {
    const Dashboard = (await import("~/components/Dashboard")).default;
    const { getByRole, findByText, queryByRole } = render(() => (
      <Dashboard relationship={rel} userId="me" displayName="Anna" />
    ));
    expect(getByRole("tab", { name: "Notes" })).toHaveAttribute("aria-selected", "true");
    expect(getByRole("heading", { name: /appreciate/i })).toBeInTheDocument();
    expect(await findByText(/7/)).toBeInTheDocument();
    fireEvent.click(getByRole("tab", { name: "Coupons" }));
    expect(location.hash).toBe("#coupons");
    expect(queryByRole("heading", { name: /appreciate/i })).toBeNull();
    expect(getByRole("heading", { name: "I'd love" })).toBeInTheDocument();
    expect(getByRole("heading", { name: /need ideas/i })).toBeInTheDocument();
  });

  it("opens on Coupons when hash is #coupons; arrow keys switch", async () => {
    history.replaceState(null, "", "#coupons");
    const Dashboard = (await import("~/components/Dashboard")).default;
    const { getByRole } = render(() => <Dashboard relationship={rel} userId="me" displayName="Anna" />);
    const coupons = getByRole("tab", { name: "Coupons" });
    expect(coupons).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(coupons, { key: "ArrowLeft" });
    expect(getByRole("tab", { name: "Notes" })).toHaveAttribute("aria-selected", "true");
  });
});
