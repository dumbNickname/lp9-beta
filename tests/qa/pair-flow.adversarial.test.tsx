import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// QA adversarial suite for PairFlow component behavior.
// Reconciled for PRD-25 (D-25.1): scan/paste no longer auto-redeems. It
// routes to the CONFIRM view (peek preview); redemption fires ONLY on the
// confirm view's Join tap. These invariants are unchanged and re-pointed to
// the new trigger point below.
//
// Covers, beyond the Dev happy-path tests:
//  - poll lifecycle (D-21.2): interval polls ~3s while waiting, STOPS on
//    pair-success and on unmount (no leaked interval).
//  - key-never-on-server: the AES key is never passed to any data-layer
//    (RPC) call; only code/archetype cross the wire.
//  - inviter migration on pair-detect: getKey(temp) -> putKey(relId) ->
//    deleteKey(temp).
//  - friendly error mapping for the redeem RPC exception strings, now
//    surfaced on the confirm view after Join.
//  - malformed/non-invite paste -> parse null -> no peek/redeem RPC call.
//  - reload-safety: a pair_invite_pending marker resumes the waiting screen
//    and starts polling; cleared on cancel.
//  - no duplicate relationship on a double Join tap (redeem-once busy guard).

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

beforeEach(() => {
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = undefined;
  vi.clearAllMocks();
  mockGetMyActiveRelationship.mockResolvedValue(null);
  mockPeekPairCode.mockResolvedValue({
    display_name: "Partner Name",
    archetype: "getting_to_know",
  });
  mockGetKey.mockResolvedValue("temp-key" as unknown as CryptoKey);
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function importPairFlow() {
  return (await import("~/components/PairFlow")).default;
}

// -------------------------------------------------------------------------
// Poll lifecycle (D-21.2)
// -------------------------------------------------------------------------

describe("PRD-21 QA: poll lifecycle + cleanup (D-21.2)", () => {
  it("polls getMyActiveRelationship on the ~3s interval while waiting", async () => {
    vi.useFakeTimers();
    mockCreatePairInvite.mockResolvedValue("POLLCODE");
    const PairFlow = await importPairFlow();
    const { getByRole } = render(() => <PairFlow />);

    fireEvent.click(getByRole("button", { name: "Invite" }));
    fireEvent.click(getByRole("button", { name: "Create invite" }));

    // Let the async beginInvite settle (createInvite + generateKey + putKey).
    await vi.waitFor(() => expect(mockCreatePairInvite).toHaveBeenCalled());

    const before = mockGetMyActiveRelationship.mock.calls.length;
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);
    const after = mockGetMyActiveRelationship.mock.calls.length;
    // At least two poll ticks fired.
    expect(after - before).toBeGreaterThanOrEqual(2);
  });

  it("STOPS polling after pair-success (no further polls once relationship appears)", async () => {
    vi.useFakeTimers();
    mockCreatePairInvite.mockResolvedValue("STOPCODE");
    const PairFlow = await importPairFlow();
    const { getByRole } = render(() => <PairFlow />);

    fireEvent.click(getByRole("button", { name: "Invite" }));
    fireEvent.click(getByRole("button", { name: "Create invite" }));
    await vi.waitFor(() => expect(mockCreatePairInvite).toHaveBeenCalled());

    // Next poll: relationship shows up -> onPaired -> stopPolling.
    mockGetMyActiveRelationship.mockResolvedValue({ id: "rel-77", status: "active" });
    await vi.advanceTimersByTimeAsync(3000);
    await vi.waitFor(() => expect(mockRefreshRelationship).toHaveBeenCalled());

    const countAfterPair = mockGetMyActiveRelationship.mock.calls.length;
    // Advance well past several intervals — no more polls should fire.
    await vi.advanceTimersByTimeAsync(3000 * 4);
    expect(mockGetMyActiveRelationship.mock.calls.length).toBe(countAfterPair);
  });

  it("STOPS polling on unmount — no leaked interval calls after cleanup", async () => {
    vi.useFakeTimers();
    mockCreatePairInvite.mockResolvedValue("UNMOUNTCODE");
    const PairFlow = await importPairFlow();
    const { getByRole, unmount } = render(() => <PairFlow />);

    fireEvent.click(getByRole("button", { name: "Invite" }));
    fireEvent.click(getByRole("button", { name: "Create invite" }));
    await vi.waitFor(() => expect(mockCreatePairInvite).toHaveBeenCalled());

    await vi.advanceTimersByTimeAsync(3000);
    const countAtUnmount = mockGetMyActiveRelationship.mock.calls.length;

    unmount();
    await vi.advanceTimersByTimeAsync(3000 * 5);
    expect(mockGetMyActiveRelationship.mock.calls.length).toBe(countAtUnmount);
  });
});

// -------------------------------------------------------------------------
// Inviter migration on pair-detect + key-never-on-server
// -------------------------------------------------------------------------

describe("PRD-21 QA: inviter pair-detect migration + key never on server", () => {
  it("on pair-detect: getKey(invite:<code>) -> putKey(relId) -> deleteKey(invite:<code>)", async () => {
    vi.useFakeTimers();
    mockCreatePairInvite.mockResolvedValue("MIGCODE");
    const PairFlow = await importPairFlow();
    const { getByRole } = render(() => <PairFlow />);

    fireEvent.click(getByRole("button", { name: "Invite" }));
    fireEvent.click(getByRole("button", { name: "Create invite" }));
    await vi.waitFor(() =>
      expect(mockPutKey).toHaveBeenCalledWith("invite:MIGCODE", "fake-crypto-key"),
    );

    mockGetMyActiveRelationship.mockResolvedValue({ id: "rel-mig", status: "active" });
    await vi.advanceTimersByTimeAsync(3000);

    await vi.waitFor(() =>
      expect(mockPutKey).toHaveBeenCalledWith("rel-mig", "temp-key"),
    );
    expect(mockGetKey).toHaveBeenCalledWith("invite:MIGCODE");
    expect(mockDeleteKey).toHaveBeenCalledWith("invite:MIGCODE");
  });

  it("invite flow sends ONLY the archetype to the server — never the key/base64", async () => {
    mockCreatePairInvite.mockResolvedValue("SRVCODE");
    const PairFlow = await importPairFlow();
    const { getByRole } = render(() => <PairFlow />);

    fireEvent.click(getByRole("button", { name: "Invite" }));
    fireEvent.click(getByRole("button", { name: "Create invite" }));
    await waitFor(() => expect(mockCreatePairInvite).toHaveBeenCalled());

    // createPairInvite received a single archetype string, no key material.
    for (const call of mockCreatePairInvite.mock.calls) {
      expect(call.length).toBe(1);
      expect(typeof call[0]).toBe("string");
      expect(JSON.stringify(call)).not.toMatch(/key|AQID|[A-Za-z0-9+/]{20,}/);
    }
  });

  it("redeem flow sends ONLY the code to the server — key stays client-side", async () => {
    mockRedeemPairCode.mockResolvedValue("rel-redeem");
    const PairFlow = await importPairFlow();
    const { getByRole, getByLabelText, findByRole } = render(() => <PairFlow />);

    fireEvent.click(getByRole("button", { name: "Join" }));
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "v1:JOINCODE:AQIDBAUGBwgJCgsMDQ4PEA==" } });
    fireEvent.click(getByRole("button", { name: "Continue" }));

    // Paste routes to the confirm view (peek), NOT a direct redeem.
    await waitFor(() => expect(mockPeekPairCode).toHaveBeenCalledWith("JOINCODE"));
    expect(mockRedeemPairCode).not.toHaveBeenCalled();

    // Redeem fires only on the explicit Join tap.
    fireEvent.click(await findByRole("button", { name: "Join" }));

    await waitFor(() => expect(mockRedeemPairCode).toHaveBeenCalled());
    // redeemPairCode called with just the code, no key base64.
    expect(mockRedeemPairCode).toHaveBeenCalledWith("JOINCODE");
    for (const call of mockRedeemPairCode.mock.calls) {
      expect(call).toEqual(["JOINCODE"]);
    }
    // Neither peek nor redeem ever received the key base64.
    for (const call of mockPeekPairCode.mock.calls) {
      expect(JSON.stringify(call)).not.toContain("AQIDBAUGBwgJCgsMDQ4PEA==");
    }
    // The key WAS stored locally under the returned rel id.
    await waitFor(() =>
      expect(mockPutKey).toHaveBeenCalledWith("rel-redeem", "imported-key"),
    );
  });
});

// -------------------------------------------------------------------------
// Friendly error mapping for every RPC exception string
// -------------------------------------------------------------------------

describe("PRD-25 QA: friendly redeem-error mapping on the confirm view (Join tap)", () => {
  const cases: Array<[string, RegExp]> = [
    ["invalid code", /not valid/i],
    ["code already used", /already been used/i],
    ["code expired", /expired/i],
    ["cannot pair with yourself", /yourself/i],
    ["relationship already exists", /already paired/i],
  ];

  for (const [rpcMsg, expected] of cases) {
    it(`maps "${rpcMsg}" to a friendly message on Join, no crash, key not stored`, async () => {
      mockRedeemPairCode.mockRejectedValue(new Error(rpcMsg));
      const PairFlow = await importPairFlow();
      const { getByRole, getByLabelText, findByRole } = render(() => <PairFlow />);

      fireEvent.click(getByRole("button", { name: "Join" }));
      const input = getByLabelText("Paste invite") as HTMLInputElement;
      fireEvent.input(input, { target: { value: "v1:BADCODE0:AQID" } });
      fireEvent.click(getByRole("button", { name: "Continue" }));

      // Confirm view -> Join tap -> redeem rejects -> friendly error shown.
      fireEvent.click(await findByRole("button", { name: "Join" }));
      await waitFor(() => expect(getByRole("alert")).toHaveTextContent(expected));
      expect(mockPutKey).not.toHaveBeenCalled();
      // Stays on the confirm view with a Cancel/Back option.
      expect(getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    });
  }

  it("an unknown RPC error falls back to a generic friendly message", async () => {
    mockRedeemPairCode.mockRejectedValue(new Error("some internal 500"));
    const PairFlow = await importPairFlow();
    const { getByRole, getByLabelText, findByRole } = render(() => <PairFlow />);

    fireEvent.click(getByRole("button", { name: "Join" }));
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "v1:CODE9999:AQID" } });
    fireEvent.click(getByRole("button", { name: "Continue" }));

    fireEvent.click(await findByRole("button", { name: "Join" }));
    await waitFor(() => expect(getByRole("alert")).toHaveTextContent(/could not pair/i));
  });
});

// -------------------------------------------------------------------------
// Malformed / non-invite payload -> no RPC call
// -------------------------------------------------------------------------

describe("PRD-25 QA: malformed paste never peeks or redeems", () => {
  const bad = ["https://evil.example", "not-a-payload", "v2:CODE:key==", "", "v1:CODE"];
  for (const payload of bad) {
    it(`rejects ${JSON.stringify(payload)} before any peek/redeem RPC`, async () => {
      const PairFlow = await importPairFlow();
      const { getByRole, getByLabelText } = render(() => <PairFlow />);

      fireEvent.click(getByRole("button", { name: "Join" }));
      const input = getByLabelText("Paste invite") as HTMLInputElement;
      fireEvent.input(input, { target: { value: payload } });
      fireEvent.click(getByRole("button", { name: "Continue" }));

      // Give any async path a tick; neither peek nor redeem may be called.
      await Promise.resolve();
      await Promise.resolve();
      expect(mockPeekPairCode).not.toHaveBeenCalled();
      expect(mockRedeemPairCode).not.toHaveBeenCalled();
      expect(mockPutKey).not.toHaveBeenCalled();
    });
  }
});

// -------------------------------------------------------------------------
// Reload-safety
// -------------------------------------------------------------------------

describe("PRD-21 QA: reload-safety via pair_invite_pending marker", () => {
  it("resumes the waiting screen and starts polling when a pending marker exists", async () => {
    vi.useFakeTimers();
    localStorage.setItem(
      "pair_invite_pending",
      JSON.stringify({ code: "RESUMED1", keyBase64: "AQID" }),
    );
    const PairFlow = await importPairFlow();
    const { findByText } = render(() => <PairFlow />);

    // Waiting screen shown on mount without any button click.
    await vi.waitFor(async () => {
      const el = await findByText(/waiting for your partner/i);
      expect(el).toBeInTheDocument();
    });

    // Polling resumed.
    const before = mockGetMyActiveRelationship.mock.calls.length;
    await vi.advanceTimersByTimeAsync(3000);
    expect(mockGetMyActiveRelationship.mock.calls.length).toBeGreaterThan(before);
  });

  it("clears the pending marker on cancel", async () => {
    localStorage.setItem(
      "pair_invite_pending",
      JSON.stringify({ code: "CANCELME", keyBase64: "AQID" }),
    );
    mockRevokePairInvite.mockResolvedValue(undefined);
    const PairFlow = await importPairFlow();
    const { getByRole, findByText } = render(() => <PairFlow />);

    await findByText(/waiting for your partner/i);
    fireEvent.click(getByRole("button", { name: "Cancel invite" }));

    await waitFor(() =>
      expect(localStorage.getItem("pair_invite_pending")).toBeNull(),
    );
    expect(mockRevokePairInvite).toHaveBeenCalledWith("CANCELME");
    // Temp key cleaned up too.
    expect(mockDeleteKey).toHaveBeenCalledWith("invite:CANCELME");
  });
});
