import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QRScanner from "~/components/QRScanner";

// jsdom lacks BarcodeDetector and getUserMedia. We control support by
// toggling the global. Default: unsupported (so the manual fallback shows
// and no camera is requested).
const ORIGINAL_BD = (globalThis as { BarcodeDetector?: unknown })
  .BarcodeDetector;

beforeEach(() => {
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = undefined;
});

afterEach(() => {
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = ORIGINAL_BD;
  vi.restoreAllMocks();
});

describe("QRScanner (unsupported / manual fallback)", () => {
  it("renders and shows the manual entry input when scanning is unsupported", async () => {
    const onDecode = vi.fn();
    const { getByLabelText, getByRole } = render(() => (
      <QRScanner onDecode={onDecode} />
    ));

    expect(getByLabelText("Paste invite")).toBeInTheDocument();
    await waitFor(() =>
      expect(getByRole("status")).toHaveTextContent(/not supported/i),
    );
  });

  it("fires onDecode with the raw payload when a valid invite is pasted", async () => {
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

  it("shows 'not a valid invite' and does NOT fire onDecode on garbage", () => {
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

  it("trims surrounding whitespace before parsing the pasted payload", () => {
    const onDecode = vi.fn();
    const { getByLabelText, getByRole } = render(() => (
      <QRScanner onDecode={onDecode} />
    ));

    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "  v1:CODE:key==  " } });
    fireEvent.click(getByRole("button", { name: "Continue" }));

    expect(onDecode).toHaveBeenCalledWith("v1:CODE:key==");
  });
});
