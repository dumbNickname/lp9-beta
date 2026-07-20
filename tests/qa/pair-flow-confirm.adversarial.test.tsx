import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// QA adversarial suite for PRD-25 — the Join CONFIRM step (D-25.1), the
// peek preview (D-25.2), and the pending-invite restore (D-25.3). These are
// the NEW behaviors PRD-25 introduces on top of the reconciled PRD-21/24
// suites; this file targets the traps the confirm step can (re)open:
//
//  - confirm-then-abandon: decode -> confirm/peek shown -> Cancel/Back ->
//    NO redeem call, no key stored.
//  - confirm after consumed-elsewhere: Join tap when redeem rejects
//    ("code already used") -> friendly error, stays on confirm with Back,
//    NO key stored, no crash.
//  - double Join tap -> redeem fires ONCE (busy guard) -> single relationship.
//  - key never in the peek RPC args or return.
//  - pending-invite restore re-shows the invite + resumes poll; inviter wins.
//
// The peekPairCode DATA-layer contract (no-consume shape, error mapping,
// data[0], no key) is proven separately in peek-pair-code.adversarial.test.ts
// (that suite must NOT mock ~/lib/data/relationship, so it lives on its own).

const mockRedeemPairCode = vi.fn();
const mockPeekPairCode = vi.fn();
const mockGetMyActiveRelationship = vi.fn();
const mockCreatePairInvite = vi.fn();
const mockRevokePairInvite = vi.fn();

vi.mock("~/lib/data/relationship", () => ({
  redeemPairCode: mockRedeemPairCode,
  peekPairCode: mockPeekPairCode,
  getMyActiveRelationship: mockGetMyActiveRelationship,
  createPairInvite: mockCreatePairInvite,
  revokePairInvite: mockRevokePairInvite,
}));

const mockPutKey = vi.fn(async () => undefined);
const mockGetKey = vi.fn(async () => "temp-key" as unknown as CryptoKey);
const mockDeleteKey = vi.fn(async () => undefined);

vi.mock("~/lib/crypto/keystore", () => ({
  putKey: mockPutKey,
  getKey: mockGetKey,
  deleteKey: mockDeleteKey,
}));

const mockImportKeyRaw = vi.fn(async () => "imported-key" as unknown as CryptoKey);

vi.mock("~/lib/crypto/aes", async () => {
  const actual =
    await vi.importActual<typeof import("~/lib/crypto/aes")>("~/lib/crypto/aes");
  return {
    ...actual,
    importKeyRaw: mockImportKeyRaw,
    generateKey: vi.fn(async () => "fake-crypto-key" as unknown as CryptoKey),
    exportKeyRaw: vi.fn(async () => new Uint8Array([1, 2, 3])),
  };
});

const mockRefreshRelationship = vi.fn(async () => undefined);
vi.mock("~/lib/stores/relationship", () => ({
  refreshRelationship: mockRefreshRelationship,
}));

vi.mock("qrcode", () => ({ default: { toCanvas: vi.fn(() => Promise.resolve()) } }));
vi.mock("~/lib/pairing/scan-fallback", () => ({
  startFallbackScan: vi.fn(() => Promise.resolve({ stop: vi.fn() })),
}));

// The AES key base64 that must NEVER leave the device on a peek/redeem.
const KEY_B64 = "AQIDBAUGBwgJCgsMDQ4PEA=="; // gitleaks:allow test fixture AES key (bytes 1..16)
const PASTE = `v1:CONFCODE:${KEY_B64}`;

beforeEach(() => {
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = undefined;
  vi.clearAllMocks();
  mockGetMyActiveRelationship.mockResolvedValue(null);
  mockGetKey.mockResolvedValue("temp-key" as unknown as CryptoKey);
  mockPeekPairCode.mockResolvedValue({
    display_name: "Partner Name",
    archetype: "getting_to_know",
  });
  localStorage.clear();
  window.history.replaceState(null, "", window.location.pathname);
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", window.location.pathname);
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function importPairFlow() {
  return (await import("~/components/PairFlow")).default;
}

// Route paste -> Continue -> confirm view; returns the render result.
async function toConfirm(value = PASTE) {
  const PairFlow = await importPairFlow();
  const res = render(() => <PairFlow />);
  fireEvent.click(res.getByRole("button", { name: "Join" }));
  const input = res.getByLabelText("Paste invite") as HTMLInputElement;
  fireEvent.input(input, { target: { value } });
  fireEvent.click(res.getByRole("button", { name: "Continue" }));
  return res;
}

// -------------------------------------------------------------------------
// Confirm-then-abandon — the whole point of the confirm step (D-25.1)
// -------------------------------------------------------------------------

describe("PRD-25 QA: confirm then abandon does not redeem or store a key", () => {
  it("peek shown -> Cancel -> NO redeem, NO key stored, invite untouched", async () => {
    const { getByRole, findByRole, queryByRole } = await toConfirm();

    // Peek preview rendered.
    await findByRole("heading", { name: /Join Partner Name\?/ });
    expect(mockPeekPairCode).toHaveBeenCalledWith("CONFCODE");
    // Peek arg carried no key material.
    for (const call of mockPeekPairCode.mock.calls) {
      expect(JSON.stringify(call)).not.toContain(KEY_B64);
    }

    // User backs out before confirming.
    fireEvent.click(getByRole("button", { name: "Cancel" }));

    // Give async a couple ticks; redeem must never fire, no key stored.
    await Promise.resolve();
    await Promise.resolve();
    expect(mockRedeemPairCode).not.toHaveBeenCalled();
    expect(mockPutKey).not.toHaveBeenCalled();
    expect(mockImportKeyRaw).not.toHaveBeenCalled();
    // Back on the Join view; no confirm heading lingering.
    await findByRole("heading", { name: "Join your partner" });
    expect(queryByRole("heading", { name: /Join Partner Name\?/ })).toBeNull();
  });
});

// -------------------------------------------------------------------------
// Confirm after the invite was consumed elsewhere (race)
// -------------------------------------------------------------------------

describe("PRD-25 QA: Join when the invite was consumed elsewhere", () => {
  it("redeem rejects 'code already used' -> friendly error, stays on confirm, no key stored, no crash", async () => {
    // Peek succeeded (code was still valid when previewed), but a partner
    // consumed it before this user's Join tap resolved.
    mockRedeemPairCode.mockRejectedValue(new Error("code already used"));
    const { getByRole, findByRole } = await toConfirm();

    const joinBtn = await findByRole("button", { name: "Join" });
    fireEvent.click(joinBtn);

    await waitFor(() =>
      expect(getByRole("alert")).toHaveTextContent(/already been used/i),
    );
    // No key was imported or stored.
    expect(mockImportKeyRaw).not.toHaveBeenCalled();
    expect(mockPutKey).not.toHaveBeenCalled();
    // Stays on the confirm view with a way back (Cancel/Back).
    expect(getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });
});

// -------------------------------------------------------------------------
// Double Join tap -> redeem once (busy guard) -> single relationship
// -------------------------------------------------------------------------

describe("PRD-25 QA: double Join tap redeems once", () => {
  it("two rapid Join taps issue exactly ONE redeem (no duplicate relationship)", async () => {
    // Hold redeem pending so both taps race against an unresolved promise.
    let resolveRedeem: (v: string) => void = () => undefined;
    mockRedeemPairCode.mockImplementation(
      () => new Promise<string>((res) => (resolveRedeem = res)),
    );

    const { findByRole } = await toConfirm();
    const joinBtn = await findByRole("button", { name: "Join" });

    fireEvent.click(joinBtn); // sets busy -> disables button + early-return guard
    fireEvent.click(joinBtn); // second tap must be a no-op

    // Let microtasks flush; the guard should have blocked the second call.
    await Promise.resolve();
    await Promise.resolve();
    expect(mockRedeemPairCode).toHaveBeenCalledTimes(1);

    // Resolve and confirm the single redeem completes cleanly.
    resolveRedeem("rel-once");
    await waitFor(() =>
      expect(mockPutKey).toHaveBeenCalledWith("rel-once", "imported-key"),
    );
    expect(mockRedeemPairCode).toHaveBeenCalledTimes(1);
    expect(mockPutKey).toHaveBeenCalledTimes(1);
  });
});

// -------------------------------------------------------------------------
// Pending-invite restore (D-25.3) — inviter path wins over a deep link
// -------------------------------------------------------------------------

describe("PRD-25 QA: pending-invite restore re-shows the invite + resumes poll", () => {
  it("mount with pair_invite_pending re-shows QR/link/Cancel and resumes polling", async () => {
    vi.useFakeTimers();
    localStorage.setItem(
      "pair_invite_pending",
      JSON.stringify({ code: "RESTORE1", keyBase64: KEY_B64 }),
    );
    const PairFlow = await importPairFlow();
    const { findByText, getByLabelText, getByRole } = render(() => <PairFlow />);

    // Waiting screen + QR/link restored without any click.
    await vi.waitFor(async () => {
      expect(await findByText(/waiting for your partner/i)).toBeInTheDocument();
    });
    expect(getByLabelText("Full invite link")).toBeInTheDocument();
    expect(getByRole("button", { name: "Cancel invite" })).toBeInTheDocument();

    // Poll resumed.
    const before = mockGetMyActiveRelationship.mock.calls.length;
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockGetMyActiveRelationship.mock.calls.length).toBeGreaterThan(before);
    // Restore path never peeks/redeems (this is the inviter, not the joiner).
    expect(mockPeekPairCode).not.toHaveBeenCalled();
    expect(mockRedeemPairCode).not.toHaveBeenCalled();
  });

  it("inviter path wins over a #pair= deep link present at the same time", async () => {
    localStorage.setItem(
      "pair_invite_pending",
      JSON.stringify({ code: "OWNCODE9", keyBase64: KEY_B64 }),
    );
    const { buildInvitePayload, buildInviteUrl } = await import("~/lib/pairing/qr");
    const url = buildInviteUrl(buildInvitePayload("OTHERCOD", KEY_B64), {
      origin: window.location.origin,
    });
    window.history.replaceState(null, "", url);

    const PairFlow = await importPairFlow();
    const { findByText } = render(() => <PairFlow />);

    await findByText(/waiting for your partner/i);
    // Deep link is NOT consumed: no peek, no redeem, fragment untouched.
    expect(mockPeekPairCode).not.toHaveBeenCalled();
    expect(mockRedeemPairCode).not.toHaveBeenCalled();
    expect(window.location.hash).toContain("pair=");
  });
});
