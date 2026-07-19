import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// QA adversarial suite for PRD-21 — the /app gate has FOUR states. Dev's
// unit test only covers the last two (no-rel -> PairFlow, active ->
// dashboard). Here we drive all four:
//   1. no session/loading      -> "Loading..."
//   2. profile w/o display_name -> Onboarding
//   3. profile w/ name, no rel  -> PairFlow
//   4. active relationship      -> dashboard placeholder

let sessionLoadingValue = false;
let userValue: unknown = { id: "u1" };
let profileValue: unknown = { display_name: "Alice" };
let profileLoadingValue = false;
let relationshipValue: unknown = null;
let relationshipLoadingValue = false;

vi.mock("~/lib/supabase", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: { getUser: vi.fn() } },
  getSupabase: vi.fn(),
}));

vi.mock("~/lib/session", () => ({
  loading: () => sessionLoadingValue,
  user: () => userValue,
  session: () => null,
}));

vi.mock("~/lib/stores/profile", () => ({
  profile: () => profileValue,
  profileLoading: () => profileLoadingValue,
  refreshProfile: vi.fn(),
  useProfileFocusRefresh: vi.fn(),
}));

vi.mock("~/lib/stores/relationship", () => ({
  relationship: () => relationshipValue,
  relationshipLoading: () => relationshipLoadingValue,
  refreshRelationship: vi.fn(),
  useRelationshipFocusRefresh: vi.fn(),
}));

// Onboarding + PairFlow both pull in modules jsdom struggles with; stub the
// heaviest (qrcode) and force BarcodeDetector absent.
vi.mock("qrcode", () => ({ default: { toCanvas: vi.fn(() => Promise.resolve()) } }));

beforeEach(() => {
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = undefined;
  sessionLoadingValue = false;
  userValue = { id: "u1" };
  profileValue = { display_name: "Alice" };
  profileLoadingValue = false;
  relationshipValue = null;
  relationshipLoadingValue = false;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PRD-21 QA: /app gate — all four states", () => {
  it("no session -> Loading", async () => {
    userValue = null;
    sessionLoadingValue = true;
    const AppShell = (await import("~/routes/app")).default;
    const { getAllByText, queryByRole } = render(() => <AppShell />);
    expect(getAllByText(/loading/i).length).toBeGreaterThan(0);
    expect(queryByRole("heading", { name: /pair with your partner/i })).toBeNull();
  });

  it("profile without display_name -> Onboarding (not PairFlow, not dashboard)", async () => {
    profileValue = { display_name: null };
    const AppShell = (await import("~/routes/app")).default;
    const { queryByRole, queryByText } = render(() => <AppShell />);
    // PairFlow heading must NOT appear.
    expect(queryByRole("heading", { name: /pair with your partner/i })).toBeNull();
    expect(queryByText(/welcome back/i)).toBeNull();
  });

  it("profile with name but no relationship -> PairFlow", async () => {
    profileValue = { display_name: "Alice" };
    relationshipValue = null;
    const AppShell = (await import("~/routes/app")).default;
    const { findByRole } = render(() => <AppShell />);
    expect(
      await findByRole("heading", { name: /pair with your partner/i }),
    ).toBeInTheDocument();
  });

  it("active relationship -> dashboard placeholder", async () => {
    relationshipValue = { id: "r1", status: "active" };
    const AppShell = (await import("~/routes/app")).default;
    const { findByText } = render(() => <AppShell />);
    expect(await findByText(/welcome back, alice/i)).toBeInTheDocument();
  });

  it("relationship still loading -> Loading, not a premature PairFlow flash", async () => {
    relationshipLoadingValue = true;
    relationshipValue = null;
    const AppShell = (await import("~/routes/app")).default;
    const { queryByRole, getAllByText } = render(() => <AppShell />);
    expect(getAllByText(/loading/i).length).toBeGreaterThan(0);
    expect(queryByRole("heading", { name: /pair with your partner/i })).toBeNull();
  });
});
