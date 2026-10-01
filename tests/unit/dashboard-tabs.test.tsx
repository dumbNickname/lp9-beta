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

describe("Settings page (PRD-51)", () => {
  it("opens from the ⋯ menu as its own view and Back returns to the tab", async () => {
    history.replaceState(null, "", "/app#mine");
    const Dashboard = (await import("~/components/Dashboard")).default;
    const { getByRole, queryByRole, findByRole } = render(() => (
      <Dashboard relationship={rel} userId="me" displayName="Anna" />
    ));
    fireEvent.click(getByRole("button", { name: "More" }));
    fireEvent.click(getByRole("button", { name: "Settings" }));
    expect(await findByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    expect(location.hash).toBe("#settings");
    expect(queryByRole("tabpanel")).toBeNull();
    expect(getByRole("heading", { name: "This device" })).toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: /back/i }));
    expect(location.hash).toBe("#mine");
    expect(getByRole("tab", { name: /my wishes/i })).toHaveAttribute("aria-selected", "true");
  });

  it("#settings in URL opens the settings page directly", async () => {
    history.replaceState(null, "", "/app#settings");
    const Dashboard = (await import("~/components/Dashboard")).default;
    const { findByRole } = render(() => <Dashboard relationship={rel} userId="me" displayName="Anna" />);
    expect(await findByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
  });
});

describe("Guide page (#guide)", () => {
  it("opens from the ⋯ menu; 'Take me there' jumps to the world", async () => {
    history.replaceState(null, "", "/app");
    const Dashboard = (await import("~/components/Dashboard")).default;
    const { getByRole, getAllByRole, findByRole } = render(() => (
      <Dashboard relationship={rel} userId="me" displayName="Anna" />
    ));
    fireEvent.click(getByRole("button", { name: "More" }));
    fireEvent.click(getAllByRole("button", { name: "How it works" })[0]!);
    expect(await findByRole("heading", { level: 1, name: "How it works" })).toBeInTheDocument();
    expect(location.hash).toBe("#guide");
    fireEvent.click(getAllByRole("button", { name: /take me there/i })[1]!);
    expect(location.hash).toBe("#mine");
    expect(getByRole("tab", { name: /my wishes/i })).toHaveAttribute("aria-selected", "true");
  });
});
