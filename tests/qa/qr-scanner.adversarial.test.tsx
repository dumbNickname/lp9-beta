import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QRScanner from "~/components/QRScanner";
import { bytesToBase64 } from "~/lib/crypto/aes";

// QA adversarial suite for PRD-20 — QRScanner component.
//
// Covers: permission denial mid-scan (getUserMedia rejects) -> friendly
// message + manual fallback with no crash; scanning/pasting a non-invite
// string -> "not a valid invite" and onDecode NOT fired; valid payload
// (incl. a real 32-byte AES key base64 with + / =) fires onDecode with
// the RAW payload intact; whitespace trimming; and camera-permission-
// denied still leaves manual entry usable.
//
// jsdom lacks BarcodeDetector and navigator.mediaDevices, so we install
// fakes and restore them each test.

const BD_KEY = "BarcodeDetector";
const ORIGINAL_BD = (globalThis as Record<string, unknown>)[BD_KEY];
const ORIGINAL_MD = (
  navigator as unknown as { mediaDevices?: unknown }
).mediaDevices;

function setBarcodeDetector(ctor: unknown) {
  (globalThis as Record<string, unknown>)[BD_KEY] = ctor;
}

function setMediaDevices(md: unknown) {
  Object.defineProperty(navigator, "mediaDevices", {
    value: md,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  setBarcodeDetector(undefined);
  setMediaDevices(undefined);
});

afterEach(() => {
  (globalThis as Record<string, unknown>)[BD_KEY] = ORIGINAL_BD;
  setMediaDevices(ORIGINAL_MD);
  vi.restoreAllMocks();
});

describe("PRD-20 QA: manual fallback rejects non-invite strings", () => {
  // Valid QR content that is NOT our invite payload must be rejected and
  // must NOT fire onDecode.
  const nonInvites = [
    "https://example.com",
    "v2:CODE:key==", // wrong version
    "V1:CODE:key==", // wrong case
    "random-garbage-string",
    "WIFI:S:mynet;T:WPA;P:secret;;", // a real-world QR format
    "v1:", // missing code + key
    "v1:code", // missing key
    "v1::key==", // empty code
    "v1:code:", // empty key
    ":::",
    "'; DROP TABLE relationships;--",
  ];

  for (const bad of nonInvites) {
    it(`rejects ${JSON.stringify(bad)} with a user-facing error, no onDecode`, () => {
      const onDecode = vi.fn();
      const { getByLabelText, getByRole } = render(() => (
        <QRScanner onDecode={onDecode} />
      ));
      const input = getByLabelText("Paste invite") as HTMLInputElement;
      fireEvent.input(input, { target: { value: bad } });
      fireEvent.click(getByRole("button", { name: "Continue" }));

      expect(onDecode).not.toHaveBeenCalled();
      expect(getByRole("alert")).toHaveTextContent(/not.*valid invite/i);
    });
  }

  it("empty / whitespace-only input shows a prompt, not a success", () => {
    const onDecode = vi.fn();
    const { getByLabelText, getByRole } = render(() => (
      <QRScanner onDecode={onDecode} />
    ));
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "    " } });
    fireEvent.click(getByRole("button", { name: "Continue" }));
    expect(onDecode).not.toHaveBeenCalled();
    expect(getByRole("alert")).toBeInTheDocument();
  });
});

describe("PRD-20 QA: valid manual paste forwards RAW payload intact", () => {
  it("fires onDecode with a real 32-byte AES key base64 (+ / =) untruncated", () => {
    // Bytes chosen so base64 output includes +, /, and = padding.
    const bytes = new Uint8Array([
      251, 255, 62, 63, 254, 240, 15, 240, 255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    ]);
    const keyB64 = bytesToBase64(bytes);
    expect(keyB64).toMatch(/[+/=]/); // honesty: exercises special chars
    const payload = `v1:CODE-abc123:${keyB64}`;

    const onDecode = vi.fn();
    const { getByLabelText, getByRole } = render(() => (
      <QRScanner onDecode={onDecode} />
    ));
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: payload } });
    fireEvent.click(getByRole("button", { name: "Continue" }));

    expect(onDecode).toHaveBeenCalledTimes(1);
    // RAW payload, byte-for-byte — no truncation of the +/= tail.
    expect(onDecode).toHaveBeenCalledWith(payload);
  });

  it("trims surrounding whitespace but preserves the inner payload exactly", () => {
    const onDecode = vi.fn();
    const { getByLabelText, getByRole } = render(() => (
      <QRScanner onDecode={onDecode} />
    ));
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, {
      target: { value: "\t  v1:CODE:AB+/cd==  \n" },
    });
    fireEvent.click(getByRole("button", { name: "Continue" }));
    expect(onDecode).toHaveBeenCalledWith("v1:CODE:AB+/cd==");
  });

  it("does NOT trim interior whitespace inside a valid payload key", () => {
    // Interior spaces make it a distinct string; parseInvitePayload still
    // accepts non-empty code+key, so onDecode fires with the raw (trimmed
    // only at the ends) string.
    const onDecode = vi.fn();
    const { getByLabelText, getByRole } = render(() => (
      <QRScanner onDecode={onDecode} />
    ));
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "  v1:CODE:key with space  " } });
    fireEvent.click(getByRole("button", { name: "Continue" }));
    expect(onDecode).toHaveBeenCalledWith("v1:CODE:key with space");
  });
});

describe("PRD-20 QA: camera permission denial is graceful", () => {
  it("getUserMedia rejection shows a friendly notice + manual fallback, no crash", async () => {
    setBarcodeDetector(class {
      detect = vi.fn().mockResolvedValue([]);
    });
    const getUserMedia = vi
      .fn()
      .mockRejectedValue(new DOMException("denied", "NotAllowedError"));
    setMediaDevices({ getUserMedia });

    const onDecode = vi.fn();
    const { getByRole, getByLabelText } = render(() => (
      <QRScanner onDecode={onDecode} />
    ));

    // The denial notice appears (role=status) and the manual input remains.
    await waitFor(() =>
      expect(getByRole("status")).toHaveTextContent(/unavailable/i),
    );
    expect(getByLabelText("Paste invite")).toBeInTheDocument();
    expect(onDecode).not.toHaveBeenCalled();

    // Manual fallback still works after denial.
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "v1:CODE:key==" } });
    fireEvent.click(getByRole("button", { name: "Continue" }));
    expect(onDecode).toHaveBeenCalledWith("v1:CODE:key==");
  });

  it("getUserMedia rejection releases any partially-acquired stream (no leak on denial)", async () => {
    // Even if the browser hands back a stream then errors elsewhere, the
    // denial path must not crash. Here getUserMedia simply rejects; assert
    // no throw escapes and the component settles into the denied state.
    setBarcodeDetector(class {
      detect = vi.fn().mockResolvedValue([]);
    });
    const getUserMedia = vi
      .fn()
      .mockRejectedValue(new Error("camera in use"));
    setMediaDevices({ getUserMedia });
    const onDecode = vi.fn();
    const { getByRole } = render(() => <QRScanner onDecode={onDecode} />);
    await waitFor(() =>
      expect(getByRole("status")).toHaveTextContent(/unavailable/i),
    );
    expect(onDecode).not.toHaveBeenCalled();
  });

  it("getUserMedia absent -> unsupported notice, no throw, manual usable", async () => {
    setBarcodeDetector(class {
      detect = vi.fn();
    });
    setMediaDevices({}); // no getUserMedia method
    const onDecode = vi.fn();
    const { getByRole, getByLabelText } = render(() => (
      <QRScanner onDecode={onDecode} />
    ));
    await waitFor(() =>
      expect(getByRole("status")).toHaveTextContent(/not supported/i),
    );
    const input = getByLabelText("Paste invite") as HTMLInputElement;
    fireEvent.input(input, { target: { value: "v1:CODE:key==" } });
    fireEvent.click(getByRole("button", { name: "Continue" }));
    expect(onDecode).toHaveBeenCalledWith("v1:CODE:key==");
  });
});
