import { cleanup, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// QA adversarial suite for PRD-24 — PairFlow #pair= deep-link consume+clear.
//
// Contract (PRD-24 / D-24.1):
//   - mounting /app with `#pair=<valid payload>` routes into Join, redeems
//     with the PARSED code, imports+stores the key under the returned rel id,
//     and CLEARS the fragment (history.replaceState) so it can't re-trigger.
//   - mounting with `#pair=<junk>` must NOT crash and must NOT redeem.
//   - a normal mount (no fragment) and the inviter path (outstanding pending
//     invite) are unaffected by the deep-link logic — the inviter path wins.
//   - the AES key is never sent to the server: redeem gets ONLY the code.

const mockRedeemPairCode = vi.fn();
const mockGetMyActiveRelationship = vi.fn();
const mockCreatePairInvite = vi.fn();
const mockRevokePairInvite = vi.fn();

vi.mock("~/lib/data/relationship", () => ({
  redeemPairCode: mockRedeemPairCode,
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
// Keep the html5-qrcode fallback inert; QRScanner may attempt it on mount.
vi.mock("~/lib/pairing/scan-fallback", () => ({
  startFallbackScan: vi.fn(() => Promise.resolve({ stop: vi.fn() })),
}));

function resetUrl() {
  window.history.replaceState(null, "", window.location.pathname);
}

beforeEach(() => {
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = undefined;
  vi.clearAllMocks();
  mockGetMyActiveRelationship.mockResolvedValue(null);
  mockGetKey.mockResolvedValue("temp-key" as unknown as CryptoKey);
  localStorage.clear();
  resetUrl();
});

afterEach(() => {
  cleanup();
  resetUrl();
  vi.restoreAllMocks();
});

async function importDeps() {
  const PairFlow = (await import("~/components/PairFlow")).default;
  const qr = await import("~/lib/pairing/qr");
  return { PairFlow, ...qr };
}

// A valid payload with a real base64-ish key containing + / = so we prove the
// deep-link path survives the special chars through encode+decode.
const KEY_B64 = "AB+/cd+/ef==";

describe("PRD-24 QA: deep-link consume + clear (valid payload)", () => {
  it("routes into Join, redeems the parsed code, stores the key, clears the fragment", async () => {
    mockRedeemPairCode.mockResolvedValue("rel-deep");
    const { PairFlow, buildInvitePayload, buildInviteUrl } = await importDeps();

    const payload = buildInvitePayload("DEEPCODE1", KEY_B64);
    const url = buildInviteUrl(payload, { origin: window.location.origin });
    window.history.replaceState(null, "", url);
    expect(window.location.hash).toContain("pair=");

    const { findByRole } = render(() => <PairFlow />);

    // Redeemed with the PARSED code only (no key/base64 crosses the wire).
    await waitFor(() =>
      expect(mockRedeemPairCode).toHaveBeenCalledWith("DEEPCODE1"),
    );
    expect(mockRedeemPairCode).toHaveBeenCalledTimes(1);
    for (const call of mockRedeemPairCode.mock.calls) {
      expect(call).toEqual(["DEEPCODE1"]);
      expect(JSON.stringify(call)).not.toContain(KEY_B64);
    }

    // Key imported + stored locally under the returned relationship id.
    await waitFor(() =>
      expect(mockPutKey).toHaveBeenCalledWith("rel-deep", "imported-key"),
    );
    expect(mockImportKeyRaw).toHaveBeenCalledTimes(1);

    // Fragment cleared so it cannot re-trigger on re-render / reload.
    expect(window.location.hash).toBe("");
    expect(window.location.href).not.toContain("pair=");

    // We landed on the Join view.
    await findByRole("heading", { name: "Join your partner" });
  });

  it("clears the fragment even when redeem REJECTS (no lingering #pair=)", async () => {
    mockRedeemPairCode.mockRejectedValue(new Error("code expired"));
    const { PairFlow, buildInvitePayload, buildInviteUrl } = await importDeps();
    const url = buildInviteUrl(buildInvitePayload("EXPIRED1", KEY_B64), {
      origin: window.location.origin,
    });
    window.history.replaceState(null, "", url);

    const { findByRole } = render(() => <PairFlow />);
    await waitFor(() => expect(mockRedeemPairCode).toHaveBeenCalled());
    // Fragment was stripped up-front (consume clears before redeem resolves).
    expect(window.location.hash).toBe("");
    // Friendly error surfaced, no crash.
    await findByRole("alert");
  });
});

describe("PRD-24 QA: deep-link with junk does not redeem or crash", () => {
  it("`#pair=<garbage>` -> parsed as invalid invite, no redeem, no key stored", async () => {
    const { PairFlow } = await importDeps();
    // A syntactically-present pair fragment whose value is NOT a valid v1
    // payload.
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}#pair=${encodeURIComponent("not-a-payload")}`,
    );

    const { findByRole } = render(() => <PairFlow />);
    // Routed into Join (fragment had a pair=), but redeem never fires.
    await findByRole("heading", { name: "Join your partner" });
    await Promise.resolve();
    await Promise.resolve();
    expect(mockRedeemPairCode).not.toHaveBeenCalled();
    expect(mockPutKey).not.toHaveBeenCalled();
    // Fragment cleared regardless.
    expect(window.location.hash).toBe("");
  });

  it("`#nonsense` (no pair key) is ignored -> stays on landing, no redeem", async () => {
    const { PairFlow } = await importDeps();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}#foo=bar`,
    );
    const { findByRole } = render(() => <PairFlow />);
    // No deep link consumed -> landing view remains.
    await findByRole("heading", { name: "Pair with your partner" });
    expect(mockRedeemPairCode).not.toHaveBeenCalled();
  });
});

describe("PRD-24 QA: deep-link does not interfere with normal / inviter paths", () => {
  it("normal mount (no fragment) shows landing, no redeem, no fragment mutation", async () => {
    const { PairFlow } = await importDeps();
    const before = window.location.href;
    const { findByRole } = render(() => <PairFlow />);
    await findByRole("heading", { name: "Pair with your partner" });
    expect(mockRedeemPairCode).not.toHaveBeenCalled();
    expect(window.location.href).toBe(before);
  });

  it("inviter path wins: a pending invite resumes waiting, deep link is NOT consumed", async () => {
    localStorage.setItem(
      "pair_invite_pending",
      JSON.stringify({ code: "OWNCODE0", keyBase64: KEY_B64 }),
    );
    const { PairFlow, buildInvitePayload, buildInviteUrl } = await importDeps();
    const url = buildInviteUrl(buildInvitePayload("OTHERCOD", KEY_B64), {
      origin: window.location.origin,
    });
    window.history.replaceState(null, "", url);

    const { findByText } = render(() => <PairFlow />);
    await findByText(/waiting for your partner/i);
    // Deep link ignored: joiner redeem never fires for the inviter device.
    expect(mockRedeemPairCode).not.toHaveBeenCalled();
    // The inviter path left the fragment untouched (it returned before
    // consuming the deep link).
    expect(window.location.hash).toContain("pair=");
  });
});
