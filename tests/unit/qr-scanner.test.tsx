import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QRScanner from "~/components/QRScanner";
import { buildInviteUrl } from "~/lib/pairing/qr";

// Mock the html5-qrcode fallback module so no real camera/library loads.
const mockStartFallbackScan = vi.fn();
vi.mock("~/lib/pairing/scan-fallback", () => ({
  startFallbackScan: (...args: unknown[]) => mockStartFallbackScan(...args),
}));

// jsdom lacks BarcodeDetector and getUserMedia. We control support by
// toggling the global. Default: native unsupported (so the fallback path is
// attempted).
const ORIGINAL_BD = (globalThis as { BarcodeDetector?: unknown })
  .BarcodeDetector;

beforeEach(() => {
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = undefined;
  mockStartFallbackScan.mockReset();
  mockStartFallbackScan.mockResolvedValue({ stop: vi.fn() });
});

afterEach(() => {
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = ORIGINAL_BD;
  vi.restoreAllMocks();
});

describe("QRScanner — fallback selection", () => {
  it("attempts the html5-qrcode fallback when BarcodeDetector is absent", async () => {
    const onDecode = vi.fn();
    render(() => <QRScanner onDecode={onDecode} />);

    await waitFor(() =>
      expect(mockStartFallbackScan).toHaveBeenCalledTimes(1),
    );
    const arg = mockStartFallbackScan.mock.calls[0]![0] as {
      container: HTMLElement;
      onDecode: (raw: string) => void;
    };
    expect(arg.container).toBeInstanceOf(HTMLElement);
    expect(typeof arg.onDecode).toBe("function");
  });

  it("does not show a dead 'not supported' notice", async () => {
    const onDecode = vi.fn();
    const { queryByText } = render(() => <QRScanner onDecode={onDecode} />);
    await waitFor(() =>
      expect(mockStartFallbackScan).toHaveBeenCalled(),
    );
    expect(queryByText(/not supported/i)).toBeNull();
  });
});

describe("QRScanner — manual entry", () => {
  it("fires onDecode when a bare payload is pasted", async () => {
    const onDecode = vi.fn();
    const { getByLabelText, getByRole } = render(() => (
      <QRScanner onDecode={onDecode} />
    ));
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "v1:ABCD1234:a+/b==" } });
    fireEvent.click(getByRole("button", { name: "Continue" }));

    expect(onDecode).toHaveBeenCalledTimes(1);
    expect(onDecode).toHaveBeenCalledWith("v1:ABCD1234:a+/b==");
  });

  it("fires onDecode with the extracted payload when a full URL is pasted", async () => {
    const onDecode = vi.fn();
    const url = buildInviteUrl("v1:ABCD1234:a+/b==", {
      origin: "https://example.com",
      basePath: "/lp9-beta/",
    });
    const { getByLabelText, getByRole } = render(() => (
      <QRScanner onDecode={onDecode} />
    ));
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: url } });
    fireEvent.click(getByRole("button", { name: "Continue" }));

    expect(onDecode).toHaveBeenCalledTimes(1);
    expect(onDecode).toHaveBeenCalledWith("v1:ABCD1234:a+/b==");
  });

  it("shows 'not a valid invite' and does NOT fire onDecode on junk", () => {
    const onDecode = vi.fn();
    const { getByLabelText, getByRole } = render(() => (
      <QRScanner onDecode={onDecode} />
    ));
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "not-an-invite" } });
    fireEvent.click(getByRole("button", { name: "Continue" }));

    expect(onDecode).not.toHaveBeenCalled();
    expect(getByRole("alert")).toHaveTextContent(/not.*valid invite/i);
  });
});
