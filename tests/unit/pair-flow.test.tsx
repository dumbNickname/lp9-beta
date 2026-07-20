import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- shared mocks ---------------------------------------------------------

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

const mockPutKey = vi.fn();
const mockGetKey = vi.fn();
const mockDeleteKey = vi.fn();

vi.mock("~/lib/crypto/keystore", () => ({
  putKey: mockPutKey,
  getKey: mockGetKey,
  deleteKey: mockDeleteKey,
}));

const mockImportKeyRaw = vi.fn();

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

const mockRefreshRelationship = vi.fn();

vi.mock("~/lib/stores/relationship", () => ({
  refreshRelationship: mockRefreshRelationship,
}));

// qrcode touches a real canvas 2d context jsdom lacks — mock it out.
vi.mock("qrcode", () => ({ default: { toCanvas: vi.fn(() => Promise.resolve()) } }));

// Mock the html5-qrcode fallback so no real camera/library loads. QRScanner
// imports it for the native-unsupported (iOS) path.
vi.mock("~/lib/pairing/scan-fallback", () => ({
  startFallbackScan: vi.fn(() => Promise.resolve({ stop: vi.fn() })),
}));

// Force the QRScanner into its manual-entry fallback (no BarcodeDetector).
beforeEach(() => {
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = undefined;
  vi.clearAllMocks();
  mockGetMyActiveRelationship.mockResolvedValue(null);
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PairFlow — join/redeem path", () => {
  it("redeems the code and stores the imported key under the returned relationship id", async () => {
    mockRedeemPairCode.mockResolvedValue("rel-42");
    mockImportKeyRaw.mockResolvedValue("imported-key" as unknown as CryptoKey);

    const PairFlow = (await import("~/components/PairFlow")).default;
    const { getByRole, getByLabelText } = render(() => <PairFlow />);

    // Landing -> Join
    fireEvent.click(getByRole("button", { name: "Join" }));

    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "v1:ABCD1234:AQID" } });
    // "Continue" inside QRScanner submits the manual form.
    fireEvent.click(getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(mockRedeemPairCode).toHaveBeenCalledWith("ABCD1234"));
    await waitFor(() =>
      expect(mockPutKey).toHaveBeenCalledWith("rel-42", "imported-key"),
    );
    expect(mockRefreshRelationship).toHaveBeenCalled();
  });

  it("shows a friendly error when the code is expired", async () => {
    mockRedeemPairCode.mockRejectedValue(new Error("code expired"));

    const PairFlow = (await import("~/components/PairFlow")).default;
    const { getByRole, getByLabelText } = render(() => <PairFlow />);

    fireEvent.click(getByRole("button", { name: "Join" }));
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "v1:EXPIRED0:AQID" } });
    fireEvent.click(getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(getByRole("alert")).toHaveTextContent(/expired/i),
    );
    expect(mockPutKey).not.toHaveBeenCalled();
  });
});

describe("PairFlow — invite path", () => {
  it("creates an invite, stores the temp key, and shows the waiting screen", async () => {
    mockCreatePairInvite.mockResolvedValue("WXYZ7890");

    const PairFlow = (await import("~/components/PairFlow")).default;
    const { getByRole, findByText } = render(() => <PairFlow />);

    fireEvent.click(getByRole("button", { name: "Invite" }));
    fireEvent.click(getByRole("button", { name: "Create invite" }));

    await findByText(/waiting for your partner/i);
    expect(mockCreatePairInvite).toHaveBeenCalledWith("getting_to_know");
    // Temp key stored under invite:<code>.
    await waitFor(() =>
      expect(mockPutKey).toHaveBeenCalledWith("invite:WXYZ7890", "fake-crypto-key"),
    );
  });
});

describe("PairFlow — deep-link (#pair=) on mount", () => {
  afterEach(() => {
    // Reset the URL fragment so tests don't leak into each other.
    window.history.replaceState(null, "", window.location.pathname);
  });

  it("routes into Join, redeems the right code, and clears the fragment", async () => {
    mockRedeemPairCode.mockResolvedValue("rel-99");
    mockImportKeyRaw.mockResolvedValue("imported-key" as unknown as CryptoKey);

    const { buildInvitePayload, buildInviteUrl } = await import(
      "~/lib/pairing/qr"
    );
    const payload = buildInvitePayload("DEEP1234", "AQID");
    const url = buildInviteUrl(payload, { origin: window.location.origin });
    // Put the #pair= fragment on the current URL before mount.
    window.history.replaceState(null, "", url);
    expect(window.location.hash).toContain("pair=");

    const PairFlow = (await import("~/components/PairFlow")).default;
    render(() => <PairFlow />);

    await waitFor(() =>
      expect(mockRedeemPairCode).toHaveBeenCalledWith("DEEP1234"),
    );
    await waitFor(() =>
      expect(mockPutKey).toHaveBeenCalledWith("rel-99", "imported-key"),
    );
    // Fragment cleared so it does not re-trigger.
    expect(window.location.hash).toBe("");
  });

  it("does not consume the deep link when an invite is outstanding", async () => {
    // Inviter reload path: pending invite present -> resume waiting screen,
    // deep link ignored.
    localStorage.setItem(
      "pair_invite_pending",
      JSON.stringify({ code: "OWNCODE0", keyBase64: "AQID" }),
    );
    const { buildInvitePayload, buildInviteUrl } = await import(
      "~/lib/pairing/qr"
    );
    const url = buildInviteUrl(buildInvitePayload("DEEP1234", "AQID"), {
      origin: window.location.origin,
    });
    window.history.replaceState(null, "", url);

    const PairFlow = (await import("~/components/PairFlow")).default;
    const { findByText } = render(() => <PairFlow />);

    await findByText(/waiting for your partner/i);
    expect(mockRedeemPairCode).not.toHaveBeenCalled();
  });
});
