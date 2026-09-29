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
  resetPoints: vi.fn(),
}));
vi.mock("~/lib/stores/claims", () => ({
  claims: () => [],
  myEscrow: () => 0,
  refreshClaims: vi.fn(),
  resetClaims: vi.fn(),
  claim: vi.fn(),
  isOpen: () => false,
  openClaimFor: () => undefined,
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
  resetCoupons: vi.fn(),
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

describe("Dashboard worlds (PRD-49)", () => {
  it("defaults to Give, switches worlds and syncs hash", async () => {
    const Dashboard = (await import("~/components/Dashboard")).default;
    const { getByRole, queryByRole, findByText, findByRole } = render(() => (
      <Dashboard relationship={rel} userId="me" displayName="Anna" />
    ));
    expect(getByRole("tab", { name: /give/i })).toHaveAttribute("aria-selected", "true");
    expect(getByRole("heading", { name: /appreciate/i })).toBeInTheDocument();
    expect(await findByText("7")).toBeInTheDocument();
    fireEvent.click(getByRole("tab", { name: /my wishes/i }));
    expect(location.hash).toBe("#mine");
    expect(queryByRole("heading", { name: /appreciate/i })).toBeNull();
    expect(getByRole("heading", { name: /need ideas/i })).toBeInTheDocument();
    fireEvent.click(await findByRole("tab", { name: /for bob/i }));
    expect(location.hash).toBe("#theirs");
    expect(getByRole("heading", { name: /bob's wishes/i })).toBeInTheDocument();
  });

  it("balance pill explains itself", async () => {
    const Dashboard = (await import("~/components/Dashboard")).default;
    const { getByRole, findByRole } = render(() => (
      <Dashboard relationship={rel} userId="me" displayName="Anna" />
    ));
    fireEvent.click(getByRole("button", { name: /hearts to spend/i }));
    expect(await findByRole("note")).toHaveTextContent(/ready to spend/i);
  });

  it("keeps the /app path when switching tabs under a <base href> (GH Pages)", async () => {
    history.replaceState(null, "", "/lp9-beta/app");
    const base = document.createElement("base");
    base.href = "/lp9-beta/";
    document.head.appendChild(base);
    try {
      const Dashboard = (await import("~/components/Dashboard")).default;
      const { getByRole } = render(() => <Dashboard relationship={rel} userId="me" displayName="Anna" />);
      fireEvent.click(getByRole("tab", { name: /my wishes/i }));
      expect(location.pathname).toBe("/lp9-beta/app");
      expect(location.hash).toBe("#mine");
      fireEvent.click(getByRole("tab", { name: /give/i }));
      expect(location.pathname).toBe("/lp9-beta/app");
      expect(location.hash).toBe("");
    } finally {
      base.remove();
    }
  });

  it("legacy #coupons opens My wishes; arrow keys cycle", async () => {
    history.replaceState(null, "", "#coupons");
    const Dashboard = (await import("~/components/Dashboard")).default;
    const { getByRole, findByRole } = render(() => <Dashboard relationship={rel} userId="me" displayName="Anna" />);
    await findByRole("tab", { name: /for bob/i });
    const mine = getByRole("tab", { name: /my wishes/i });
    expect(mine).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(mine, { key: "ArrowRight" });
    expect(getByRole("tab", { name: /for bob/i })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(getByRole("tab", { name: /for bob/i }), { key: "ArrowRight" });
    expect(getByRole("tab", { name: /give/i })).toHaveAttribute("aria-selected", "true");
  });
});
