import { render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InviteError } from "~/lib/data/pairErrors";

const mockPeekPairCode = vi.fn();
const mockRedeemPairCode = vi.fn();
const mockSetAddingPartner = vi.fn();
let relationshipsValue: { id: string }[] = [];

vi.mock("~/lib/data/relationship", () => ({
  redeemPairCode: mockRedeemPairCode,
  peekPairCode: mockPeekPairCode,
  getMyActiveRelationship: vi.fn(async () => null),
  createPairInvite: vi.fn(),
  revokePairInvite: vi.fn(),
}));

vi.mock("~/lib/crypto/keystore", () => ({
  putKey: vi.fn(),
  getKey: vi.fn(),
  deleteKey: vi.fn(),
}));

vi.mock("~/lib/stores/relationship", () => ({
  onNewRelationship: vi.fn(),
  relationships: () => relationshipsValue,
  setAddingPartner: mockSetAddingPartner,
}));

vi.mock("qrcode", () => ({ default: { toCanvas: vi.fn(() => Promise.resolve()) } }));
vi.mock("~/lib/pairing/scan-fallback", () => ({
  startFallbackScan: vi.fn(() => Promise.resolve({ stop: vi.fn() })),
}));

beforeEach(() => {
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = undefined;
  vi.clearAllMocks();
  vi.resetModules();
  localStorage.clear();
  mockPeekPairCode.mockRejectedValue(new InviteError("used", "That invite has already been used."));
  window.history.replaceState(null, "", "/app#pair=v1%3AUSED1234%3AAQID");
});

afterEach(() => {
  relationshipsValue = [];
  window.history.replaceState(null, "", window.location.pathname);
});

describe("PairFlow — reopening a used invite link", () => {
  it("returns a paired user to their pair instead of an error", async () => {
    relationshipsValue = [{ id: "r1" }];
    const PairFlow = (await import("~/components/PairFlow")).default;
    const { queryByRole } = render(() => <PairFlow />);

    await waitFor(() => expect(mockSetAddingPartner).toHaveBeenCalledWith(false));
    expect(queryByRole("heading", { name: /invite unavailable/i })).toBeNull();
    expect(mockRedeemPairCode).not.toHaveBeenCalled();
  });

  it("still explains a used invite to someone with no pair", async () => {
    const PairFlow = (await import("~/components/PairFlow")).default;
    const { findByRole } = render(() => <PairFlow />);

    expect(await findByRole("heading", { name: /invite unavailable/i })).toBeInTheDocument();
    expect(mockSetAddingPartner).not.toHaveBeenCalled();
  });
});
