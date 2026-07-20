import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- shared mocks ---------------------------------------------------------

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
  mockPeekPairCode.mockResolvedValue({
    display_name: "Partner Name",
    archetype: "getting_to_know",
  });
  localStorage.clear();
});

afterEach(() => {
  window.history.replaceState(null, "", window.location.pathname);
  vi.restoreAllMocks();
});

describe("PairFlow — join confirm path (D-25.1)", () => {
  it("routes a pasted invite to the confirm view (peek called, no redeem yet)", async () => {
    const PairFlow = (await import("~/components/PairFlow")).default;
    const { getByRole, getByLabelText, findByRole } = render(() => <PairFlow />);

    // Landing -> Join
    fireEvent.click(getByRole("button", { name: "Join" }));

    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "v1:ABCD1234:AQID" } });
    fireEvent.click(getByRole("button", { name: "Continue" }));

    // Confirm view shows the peeked inviter name; redeem NOT called.
    await findByRole("heading", { name: /Join Partner Name\?/ });
    expect(mockPeekPairCode).toHaveBeenCalledWith("ABCD1234");
    expect(mockRedeemPairCode).not.toHaveBeenCalled();
  });

  it("redeems ONCE and stores the imported key only when Join is tapped", async () => {
    mockRedeemPairCode.mockResolvedValue("rel-42");
    mockImportKeyRaw.mockResolvedValue("imported-key" as unknown as CryptoKey);

    const PairFlow = (await import("~/components/PairFlow")).default;
    const { getByRole, getByLabelText, findByRole } = render(() => <PairFlow />);

    fireEvent.click(getByRole("button", { name: "Join" }));
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "v1:ABCD1234:AQID" } });
    fireEvent.click(getByRole("button", { name: "Continue" }));

    const joinButton = await findByRole("button", { name: "Join" });
    expect(mockRedeemPairCode).not.toHaveBeenCalled();

    fireEvent.click(joinButton);

    await waitFor(() =>
      expect(mockRedeemPairCode).toHaveBeenCalledWith("ABCD1234"),
    );
    expect(mockRedeemPairCode).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(mockPutKey).toHaveBeenCalledWith("rel-42", "imported-key"),
    );
    expect(mockRefreshRelationship).toHaveBeenCalled();
  });

  it("shows a friendly error and stores no key when redeem fails on Join", async () => {
    mockRedeemPairCode.mockRejectedValue(new Error("code already used"));

    const PairFlow = (await import("~/components/PairFlow")).default;
    const { getByRole, getByLabelText, findByRole } = render(() => <PairFlow />);

    fireEvent.click(getByRole("button", { name: "Join" }));
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "v1:USED1234:AQID" } });
    fireEvent.click(getByRole("button", { name: "Continue" }));

    fireEvent.click(await findByRole("button", { name: "Join" }));

    await waitFor(() =>
      expect(getByRole("alert")).toHaveTextContent(/already been used/i),
    );
    expect(mockPutKey).not.toHaveBeenCalled();
    // Still on the confirm view with a Cancel/Back option.
    expect(getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("peek failure shows a friendly message with no Join action and no redeem", async () => {
    mockPeekPairCode.mockRejectedValue(new Error("That invite has expired."));

    const PairFlow = (await import("~/components/PairFlow")).default;
    const { getByRole, getByLabelText, findByRole, queryByRole } = render(
      () => <PairFlow />,
    );

    fireEvent.click(getByRole("button", { name: "Join" }));
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "v1:EXPIRED0:AQID" } });
    fireEvent.click(getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(getByRole("alert")).toHaveTextContent(/expired/i),
    );
    // No Join button offered on a failed peek.
    expect(queryByRole("button", { name: "Join" })).toBeNull();
    expect(mockRedeemPairCode).not.toHaveBeenCalled();
    // A Back button lets the user retreat.
    await findByRole("button", { name: "Back" });
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

  it("routes into the confirm view (peek, no redeem) and clears the fragment", async () => {
    const { buildInvitePayload, buildInviteUrl } = await import(
      "~/lib/pairing/qr"
    );
    const payload = buildInvitePayload("DEEP1234", "AQID");
    const url = buildInviteUrl(payload, { origin: window.location.origin });
    // Put the #pair= fragment on the current URL before mount.
    window.history.replaceState(null, "", url);
    expect(window.location.hash).toContain("pair=");

    const PairFlow = (await import("~/components/PairFlow")).default;
    const { findByRole } = render(() => <PairFlow />);

    // Confirm view shown; peek called with the parsed code; NO redeem.
    await findByRole("heading", { name: /Join Partner Name\?/ });
    expect(mockPeekPairCode).toHaveBeenCalledWith("DEEP1234");
    expect(mockRedeemPairCode).not.toHaveBeenCalled();
    // Fragment cleared so it does not re-trigger / burn the invite.
    expect(window.location.hash).toBe("");
  });

  it("Join tap after a deep-link confirm redeems the parsed code", async () => {
    mockRedeemPairCode.mockResolvedValue("rel-99");
    mockImportKeyRaw.mockResolvedValue("imported-key" as unknown as CryptoKey);

    const { buildInvitePayload, buildInviteUrl } = await import(
      "~/lib/pairing/qr"
    );
    const url = buildInviteUrl(buildInvitePayload("DEEP1234", "AQID"), {
      origin: window.location.origin,
    });
    window.history.replaceState(null, "", url);

    const PairFlow = (await import("~/components/PairFlow")).default;
    const { findByRole } = render(() => <PairFlow />);

    fireEvent.click(await findByRole("button", { name: "Join" }));

    await waitFor(() =>
      expect(mockRedeemPairCode).toHaveBeenCalledWith("DEEP1234"),
    );
    await waitFor(() =>
      expect(mockPutKey).toHaveBeenCalledWith("rel-99", "imported-key"),
    );
  });

  it("does not consume the deep link when an invite is outstanding (inviter restore)", async () => {
    // Inviter reload path: pending invite present -> resume waiting screen,
    // deep link ignored, poll resumes, no confirm/redeem.
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
    const { findByText, getByLabelText } = render(() => <PairFlow />);

    // Invite view re-shows the QR/link (restored from localStorage).
    await findByText(/waiting for your partner/i);
    expect(getByLabelText("Full invite link")).toBeInTheDocument();
    expect(mockRedeemPairCode).not.toHaveBeenCalled();
    expect(mockPeekPairCode).not.toHaveBeenCalled();
  });
});
