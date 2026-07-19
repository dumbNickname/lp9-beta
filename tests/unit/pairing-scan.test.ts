import { afterEach, describe, expect, it, vi } from "vitest";
import { isSupported, startScan } from "~/lib/pairing/scan";

// Save/restore the global so tests don't leak state into each other.
const ORIGINAL_BD = (globalThis as { BarcodeDetector?: unknown })
  .BarcodeDetector;

function setBarcodeDetector(ctor: unknown) {
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = ctor;
}

afterEach(() => {
  (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector = ORIGINAL_BD;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// A fake MediaStream that records whether its tracks were stopped.
function fakeStream() {
  const track = { stop: vi.fn() };
  return {
    stream: { getTracks: () => [track] } as unknown as MediaStream,
    track,
  };
}

describe("pairing/scan isSupported", () => {
  it("returns true when BarcodeDetector is a constructor", () => {
    setBarcodeDetector(class {});
    expect(isSupported()).toBe(true);
  });

  it("returns false when BarcodeDetector is absent", () => {
    setBarcodeDetector(undefined);
    expect(isSupported()).toBe(false);
  });

  it("returns false when BarcodeDetector is not a function", () => {
    setBarcodeDetector({});
    expect(isSupported()).toBe(false);
  });

  it("never throws", () => {
    setBarcodeDetector(undefined);
    expect(() => isSupported()).not.toThrow();
  });
});

describe("pairing/scan startScan", () => {
  it("returns null when BarcodeDetector is unavailable", () => {
    setBarcodeDetector(undefined);
    const { stream } = fakeStream();
    const result = startScan({
      video: {} as HTMLVideoElement,
      stream,
      onDecode: vi.fn(),
    });
    expect(result).toBeNull();
  });

  it("emits the decoded raw string from the detector and stops itself", async () => {
    const detect = vi.fn().mockResolvedValue([{ rawValue: "v1:CODE:key==" }]);
    setBarcodeDetector(
      class {
        detect = detect;
      },
    );
    const { stream, track } = fakeStream();
    const onDecode = vi.fn();

    startScan({
      video: {} as HTMLVideoElement,
      stream,
      onDecode,
    });

    // Let the async detection loop run.
    await vi.waitFor(() => expect(onDecode).toHaveBeenCalledTimes(1));
    expect(onDecode).toHaveBeenCalledWith("v1:CODE:key==");
    // Self-stop releases the camera.
    expect(track.stop).toHaveBeenCalledTimes(1);
  });

  it("stop() stops all MediaStream tracks and halts polling", async () => {
    // Detector that never finds a code, so the loop would keep polling.
    const detect = vi.fn().mockResolvedValue([]);
    setBarcodeDetector(
      class {
        detect = detect;
      },
    );
    const { stream, track } = fakeStream();
    const onDecode = vi.fn();

    const scanner = startScan({
      video: {} as HTMLVideoElement,
      stream,
      onDecode,
      intervalMs: 10,
    });
    expect(scanner).not.toBeNull();

    // Let at least one detect cycle run, then stop.
    await vi.waitFor(() => expect(detect).toHaveBeenCalled());
    scanner!.stop();
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(onDecode).not.toHaveBeenCalled();

    // A second stop() is a no-op (idempotent, no extra track.stop).
    scanner!.stop();
    expect(track.stop).toHaveBeenCalledTimes(1);
  });
});
