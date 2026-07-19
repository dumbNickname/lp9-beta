import { render } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Controllable store/session state for the gate.
let relationshipValue: unknown = null;
let profileValue: unknown = { display_name: "Alice" };

vi.mock("~/lib/supabase", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: { getUser: vi.fn() } },
  getSupabase: vi.fn(),
}));

vi.mock("~/lib/session", () => ({
  loading: () => false,
  user: () => ({ id: "u1" }),
  session: () => null,
}));

vi.mock("~/lib/stores/profile", () => ({
  profile: () => profileValue,
  profileLoading: () => false,
  refreshProfile: vi.fn(),
  useProfileFocusRefresh: vi.fn(),
}));

vi.mock("~/lib/stores/relationship", () => ({
  relationship: () => relationshipValue,
  relationshipLoading: () => false,
  refreshRelationship: vi.fn(),
  useRelationshipFocusRefresh: vi.fn(),
}));

// PairFlow pulls in qrcode; stub it so the gate test doesn't touch canvas.
vi.mock("qrcode", () => ({ default: { toCanvas: vi.fn(() => Promise.resolve()) } }));

beforeEach(() => {
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = undefined;
});

afterEach(() => {
  relationshipValue = null;
  profileValue = { display_name: "Alice" };
  vi.restoreAllMocks();
});

describe("AppShell gate — relationship", () => {
  it("renders PairFlow when there is no active relationship", async () => {
    relationshipValue = null;
    const AppShell = (await import("~/routes/app")).default;
    const { findByRole } = render(() => <AppShell />);
    expect(await findByRole("heading", { name: /pair with your partner/i })).toBeInTheDocument();
  });

  it("renders the dashboard placeholder when a relationship is active", async () => {
    relationshipValue = { id: "r1", status: "active" };
    const AppShell = (await import("~/routes/app")).default;
    const { findByText } = render(() => <AppShell />);
    expect(await findByText(/welcome back, alice/i)).toBeInTheDocument();
  });
});
