import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// QA adversarial suite for PRD-22 UI: the one-time recovery overlay in the
// app shell (D-22.3) and the RecoveryPassword restore failure path.
//
// D-22.3 contract: when a relationship first appears, the "set recovery
// password" overlay renders ONCE above the dashboard (not blocking it);
// skipping or setting marks localStorage `recovery_prompted:<relId>` so it
// does NOT reappear on re-render/reload.

let relationshipValue: unknown = null;

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
  profile: () => ({ display_name: "Alice" }),
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

// RecoveryPassword pulls crypto/data modules; stub it to a thin shim that
// exposes the props the shell wires (onSkip/onDone) so we test the SHELL's
// one-time gating logic, not the crypto (covered elsewhere).
vi.mock("~/components/RecoveryPassword", () => ({
  default: (props: { onSkip?: () => void; onDone?: () => void }) => (
    <div data-testid="recovery-overlay">
      <button data-testid="ov-skip" onClick={() => props.onSkip?.()}>skip</button>
      <button data-testid="ov-done" onClick={() => props.onDone?.()}>done</button>
    </div>
  ),
}));

// qrcode is imported transitively by PairFlow (fallback path); stub it.
vi.mock("qrcode", () => ({ default: { toCanvas: vi.fn(() => Promise.resolve()) } }));

beforeEach(() => {
  relationshipValue = { id: "rel-42", status: "active" };
  try {
    localStorage.clear();
  } catch {
    /* jsdom provides localStorage */
  }
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PRD-22 QA: recovery overlay shows once (D-22.3)", () => {
  it("shows the overlay when a relationship first appears, alongside the dashboard", async () => {
    const AppShell = (await import("~/routes/app")).default;
    const { findByTestId, getByText } = render(() => <AppShell />);
    expect(await findByTestId("recovery-overlay")).toBeInTheDocument();
    // Dashboard is NOT blocked -- it renders alongside the overlay.
    expect(getByText(/welcome back, alice/i)).toBeInTheDocument();
  });

  it("skipping marks localStorage recovery_prompted:<relId> and hides the overlay", async () => {
    const AppShell = (await import("~/routes/app")).default;
    const { findByTestId, queryByTestId, getByTestId } = render(() => <AppShell />);
    await findByTestId("recovery-overlay");

    fireEvent.click(getByTestId("ov-skip"));

    await waitFor(() => expect(queryByTestId("recovery-overlay")).toBeNull());
    expect(localStorage.getItem("recovery_prompted:rel-42")).toBe("1");
  });

  it("setting (onDone) also marks prompted and hides the overlay", async () => {
    const AppShell = (await import("~/routes/app")).default;
    const { findByTestId, queryByTestId, getByTestId } = render(() => <AppShell />);
    await findByTestId("recovery-overlay");

    fireEvent.click(getByTestId("ov-done"));

    await waitFor(() => expect(queryByTestId("recovery-overlay")).toBeNull());
    expect(localStorage.getItem("recovery_prompted:rel-42")).toBe("1");
  });

  it("does NOT reappear on a reload / remount once prompted (reload-safe)", async () => {
    // Pre-seed the flag as a prior session would have.
    localStorage.setItem("recovery_prompted:rel-42", "1");
    const AppShell = (await import("~/routes/app")).default;
    const { queryByTestId, findByText } = render(() => <AppShell />);
    // Dashboard renders...
    expect(await findByText(/welcome back, alice/i)).toBeInTheDocument();
    // ...but the overlay must be absent.
    expect(queryByTestId("recovery-overlay")).toBeNull();
  });

  it("a DIFFERENT relationship id still shows the overlay (per-relationship flag)", async () => {
    localStorage.setItem("recovery_prompted:rel-42", "1");
    relationshipValue = { id: "rel-99", status: "active" };
    const AppShell = (await import("~/routes/app")).default;
    const { findByTestId } = render(() => <AppShell />);
    expect(await findByTestId("recovery-overlay")).toBeInTheDocument();
  });
});
