import { cleanup, fireEvent, render, screen, waitFor, within } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getKey = vi.fn();
const getRelationshipWrap = vi.fn();
const resetAccount = vi.fn(() => Promise.resolve());

vi.mock("~/lib/supabase", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: { getUser: vi.fn() } },
  getSupabase: vi.fn(),
}));
vi.mock("~/lib/crypto/keystore", () => ({ getKey: (id: string) => getKey(id), putKey: vi.fn() }));
vi.mock("~/lib/data/relationship", () => ({
  getRelationshipWrap: (id: string) => getRelationshipWrap(id),
  setRecoveryPassword: vi.fn(),
}));
vi.mock("~/lib/session", () => ({ resetAccount: () => resetAccount() }));

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ConfirmSheet", () => {
  it("resolves true on confirm, false on cancel/Escape", async () => {
    const { default: ConfirmHost, confirmSheet } = await import("~/components/ConfirmSheet");
    render(() => <ConfirmHost />);
    const { findByRole, queryByRole } = screen;
    const p1 = confirmSheet({ title: "Claim it?", body: "8 hearts", confirmLabel: "Claim" });
    const dialog = await findByRole("alertdialog");
    expect(dialog).toHaveTextContent("8 hearts");
    fireEvent.click(await findByRole("button", { name: "Claim" }));
    expect(await p1).toBe(true);
    expect(queryByRole("alertdialog")).toBeNull();

    const p2 = confirmSheet({ title: "Delete?" });
    fireEvent.click(await findByRole("button", { name: "Cancel" }));
    expect(await p2).toBe(false);

    const p3 = confirmSheet({ title: "Retire?" });
    fireEvent.keyDown(await findByRole("alertdialog"), { key: "Escape" });
    expect(await p3).toBe(false);
  });

  it("falls back to window.confirm when no host is mounted", async () => {
    const { confirmSheet } = await import("~/components/ConfirmSheet");
    const spy = vi.spyOn(window, "confirm").mockReturnValue(true);
    expect(await confirmSheet({ title: "x" })).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("lastSeen", () => {
  it("first visit marks nothing; later items after baseline are new", async () => {
    vi.resetModules();
    const m = await import("~/lib/lastSeen");
    const b1 = m.sessionBaseline("r1");
    expect(b1).toBeNull();
    expect(m.isNewSince(b1, "2026-09-29T10:00:00Z")).toBe(false);
    expect(localStorage.getItem("last_seen:r1")).not.toBeNull();
    // Same session: stable baseline.
    expect(m.sessionBaseline("r1")).toBeNull();
    m.resetLastSeenForTests();
    localStorage.setItem("last_seen:r1", "2026-09-29T10:00:00.000Z");
    const b2 = m.sessionBaseline("r1");
    expect(m.isNewSince(b2, "2026-09-29T11:00:00.000Z")).toBe(true);
    expect(m.isNewSince(b2, "2026-09-29T09:00:00.000Z")).toBe(false);
  });
});

describe("DeviceSettings", () => {
  it("shows recovery status and resets after confirm", async () => {
    getKey.mockResolvedValue({});
    getRelationshipWrap.mockResolvedValue(null);
    const { default: ConfirmHost } = await import("~/components/ConfirmSheet");
    const DeviceSettings = (await import("~/components/DeviceSettings")).default;
    const reload = vi.fn();
    Object.defineProperty(window, "location", { value: { ...window.location, reload }, configurable: true });
    const { getByRole, findByText } = render(() => (
      <>
        <DeviceSettings relationshipId="r1" />
        <ConfirmHost />
      </>
    ));
    expect(await findByText(/Not set/)).toBeInTheDocument();
    expect(getByRole("button", { name: "Set" })).toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: "Reset device" }));
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Reset device" }));
    await waitFor(() => expect(resetAccount).toHaveBeenCalled());
  });

  it("offers unlock when password set but key missing", async () => {
    getKey.mockResolvedValue(null);
    getRelationshipWrap.mockResolvedValue({ wrapped_key_blob: new Uint8Array() });
    const DeviceSettings = (await import("~/components/DeviceSettings")).default;
    const { findByRole, findByText } = render(() => <DeviceSettings relationshipId="r1" />);
    expect(await findByText(/Set — you can unlock/)).toBeInTheDocument();
    expect(await findByRole("button", { name: "Unlock notes" })).toBeInTheDocument();
  });
});
