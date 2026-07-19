import { cleanup, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";
import RecoveryWarning from "~/components/RecoveryWarning";

// QA adversarial suite for PRD-23 recovery-warning surfaces. Verifies the
// honest copy renders, that the warning appears on set/change but NOT
// restore, that the anon nudge is §3-compliant, and that the warning is
// non-blocking (does not remove skip/submit).
//
// RecoveryPassword pulls crypto + data modules in at import time; stub them
// so these render-only assertions stay focused on the copy/surfaces.
vi.mock("~/lib/crypto/recovery", () => ({
  DEFAULT_ITERATIONS: 1,
  SALT_BYTES: 16,
  WRAP_ALGO: "AES-GCM",
  deriveWrappingKey: vi.fn(),
  unwrapKey: vi.fn(),
  wrapKey: vi.fn(),
}));
vi.mock("~/lib/crypto/keystore", () => ({
  getKey: vi.fn(),
  putKey: vi.fn(),
}));
vi.mock("~/lib/data/relationship", () => ({
  getRelationshipWrap: vi.fn(),
  setRecoveryPassword: vi.fn(),
}));

// Onboarding pulls in the profile store (Supabase); stub it.
vi.mock("~/lib/stores/profile", () => ({
  saveProfile: vi.fn(),
  refreshProfile: vi.fn(),
}));

afterEach(cleanup);

describe("PRD-23 RecoveryWarning honesty", () => {
  function text() {
    const { container } = render(() => <RecoveryWarning />);
    return (container.textContent ?? "").toLowerCase();
  }

  it("states forgotten password = comments unreadable forever", () => {
    expect(text()).toContain("unreadable forever");
  });

  it("states the recovery password is the only way to restore comments", () => {
    expect(text()).toContain("only way to restore");
  });

  it("states comments are end-to-end encrypted", () => {
    expect(text()).toContain("end-to-end encrypted");
  });

  it("says there is no backdoor (no dishonest reassurance)", () => {
    expect(text()).toContain("no backdoor");
  });

  it("distinguishes server-recoverable data from key-gated comment text", () => {
    const t = text();
    // Account/profile/coupon data is on the servers and recoverable.
    expect(t).toContain("stored on our");
    // ...but only the comment text is gated by the key.
    expect(t).toContain("comment text");
    // It does NOT falsely claim everything is recoverable.
    expect(t).not.toContain("everything is recoverable");
    expect(t).not.toMatch(/all your data can be recovered/);
  });

  it("does not carry the forbidden 'only on your device' data claim", () => {
    expect(text()).not.toContain("only on your device");
  });
});

describe("PRD-23 surface coverage (set / change / restore)", () => {
  const WARNING = "unreadable forever";

  async function renderMode(mode: "set" | "change" | "restore") {
    const RecoveryPassword = (await import("~/components/RecoveryPassword"))
      .default;
    return render(() => (
      <RecoveryPassword mode={mode} relationshipId="rel-1" onSkip={vi.fn()} />
    ));
  }

  it("(1) set mode renders the warning", async () => {
    const { container } = await renderMode("set");
    expect(container.textContent).toContain(WARNING);
  });

  it("(2) change mode renders the warning", async () => {
    const { container } = await renderMode("change");
    expect(container.textContent).toContain(WARNING);
  });

  it("(3) restore mode does NOT render the warning (stays focused)", async () => {
    const { container } = await renderMode("restore");
    expect(container.textContent).not.toContain(WARNING);
  });

  it("restore mode still renders its unlock form (not blank)", async () => {
    const { getByRole } = await renderMode("restore");
    expect(getByRole("button", { name: /unlock/i })).toBeInTheDocument();
  });
});

describe("PRD-23 warning is non-blocking in set mode", () => {
  async function renderSet() {
    const RecoveryPassword = (await import("~/components/RecoveryPassword"))
      .default;
    return render(() => (
      <RecoveryPassword mode="set" relationshipId="rel-1" onSkip={vi.fn()} />
    ));
  }

  it("the note does not steal focus (role=note, not alert)", async () => {
    const { getAllByRole, queryByRole } = await renderSet();
    expect(getAllByRole("note").length).toBeGreaterThan(0);
    // The only role=alert would be a validation error; none on initial render.
    expect(queryByRole("alert")).toBeNull();
  });

  it("submit button renders and is enabled despite the warning", async () => {
    const { getByRole } = await renderSet();
    const submit = getByRole("button", {
      name: /set password/i,
    }) as HTMLButtonElement;
    expect(submit).toBeInTheDocument();
    expect(submit.disabled).toBe(false);
  });

  it("skip button renders and is enabled despite the warning", async () => {
    const { getByRole } = await renderSet();
    const skip = getByRole("button", {
      name: /skip for now/i,
    }) as HTMLButtonElement;
    expect(skip).toBeInTheDocument();
    expect(skip.disabled).toBe(false);
  });
});

describe("PRD-23 anon nudge is §3-compliant and does not overclaim", () => {
  async function renderOnboarding() {
    const Onboarding = (await import("~/components/Onboarding")).default;
    return render(() => <Onboarding />);
  }

  it("uses the honest §3 wording (cannot recover without an account)", async () => {
    const { container } = await renderOnboarding();
    const t = (container.textContent ?? "").toLowerCase();
    expect(t).toContain("cannot recover");
    expect(t).toContain("without linking an account");
  });

  it("does NOT claim comment-specific 'only on your device' semantics", async () => {
    const { container } = await renderOnboarding();
    const t = (container.textContent ?? "").toLowerCase();
    expect(t).not.toContain("only on your device");
    expect(t).not.toContain("only on this device");
    // The anon nudge is about account recovery, not E2E key semantics.
    expect(t).not.toContain("end-to-end");
  });

  it("wraps the nudge in a non-blocking note (info Callout), not an alert", async () => {
    const { getByRole, queryByRole } = await renderOnboarding();
    expect(getByRole("note")).toHaveClass("callout--info");
    // Only role=alert would be a submit validation error; none initially.
    expect(queryByRole("alert")).toBeNull();
  });
});
