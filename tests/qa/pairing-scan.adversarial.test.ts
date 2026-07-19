import { afterEach, describe, expect, it, vi } from "vitest";
import { isSupported, startScan } from "~/lib/pairing/scan";

// QA adversarial suite for PRD-20 — scan.ts wrapper.
//
// Focus: feature detection robustness, SSR-safety, and camera-stream
// leak prevention (every MediaStream track's stop() must be called;
// stop() must be idempotent; auto-stop-on-decode must also release).
//
// jsdom has neither BarcodeDetector nor MediaStream, so we fabricate
// both. The single hard invariant across every case: no thrown error,
// and no leaked (un-stopped) camera track.

const BD_KEY = "BarcodeDetector";
const ORIGINAL_BD = (globalThis as Record<string, unknown>)[BD_KEY];

function setBarcodeDetector(ctor: unknown) {
  (globalThis as Record<string, unknown>)[BD_KEY] = ctor;
}

afterEach(() => {
  (globalThis as Record<string, unknown>)[BD_KEY] = ORIGINAL_BD;
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// A fake MediaStream whose tracks record stop() calls. `nTracks` lets us
// prove EVERY track is released, not just the first.
function fakeStream(nTracks = 1) {
  const tracks = Array.from({ length: nTracks }, () => ({ stop: vi.fn() }));
  return {
    stream: { getTracks: () => tracks } as unknown as MediaStream,
    tracks,
  };
}

describe("PRD-20 QA: isSupported() feature-detection is exact and total", () => {
  it("true only when BarcodeDetector is a constructor (function)", () => {
    setBarcodeDetector(class {});
    expect(isSupported()).toBe(true);
    setBarcodeDetector(function () {});
    expect(isSupported()).toBe(true);
  });

  it("false for absent / undefined / null", () => {
    setBarcodeDetector(undefined);
    expect(isSupported()).toBe(false);
    setBarcodeDetector(null);
    expect(isSupported()).toBe(false);
    delete (globalThis as Record<string, unknown>)[BD_KEY];
    expect(isSupported()).toBe(false);
  });

  it("false for a non-function value (object, string, number, array)", () => {
    for (const v of [{}, "BarcodeDetector", 42, [], true, Symbol("x")]) {
      setBarcodeDetector(v);
      expect(isSupported(), `value=${String(v)}`).toBe(false);
    }
  });

  it("never throws regardless of the global's shape", () => {
    for (const v of [undefined, null, {}, 0, "", NaN, class {}]) {
      setBarcodeDetector(v);
      expect(() => isSupported()).not.toThrow();
    }
  });

  it("SSR-safe: does not throw and returns false with no window/navigator", () => {
    // scan.ts only reads globalThis.BarcodeDetector lazily; simulate a
    // prerender process where the API simply isn't present.
    delete (globalThis as Record<string, unknown>)[BD_KEY];
    expect(() => isSupported()).not.toThrow();
    expect(isSupported()).toBe(false);
  });
});

describe("PRD-20 QA: startScan() returns null when unsupported (no crash)", () => {
  it("returns null and never touches the stream when BarcodeDetector absent", () => {
    setBarcodeDetector(undefined);
    const { stream, tracks } = fakeStream(2);
    const onDecode = vi.fn();
    const result = startScan({
      video: {} as HTMLVideoElement,
      stream,
      onDecode,
    });
    expect(result).toBeNull();
    expect(onDecode).not.toHaveBeenCalled();
    // No tracks stopped because startScan bailed before owning the stream.
    for (const t of tracks) expect(t.stop).not.toHaveBeenCalled();
  });
});

describe("PRD-20 QA: camera-stream leak prevention", () => {
  it("auto-stop on first decode releases EVERY track exactly once", async () => {
    const detect = vi.fn().mockResolvedValue([{ rawValue: "v1:C:key==" }]);
    setBarcodeDetector(class {
      detect = detect;
    });
    const { stream, tracks } = fakeStream(3);
    const onDecode = vi.fn();

    startScan({ video: {} as HTMLVideoElement, stream, onDecode });

    await vi.waitFor(() => expect(onDecode).toHaveBeenCalledTimes(1));
    for (const t of tracks) expect(t.stop).toHaveBeenCalledTimes(1);
  });

  it("explicit stop() releases every track and halts the poll loop", async () => {
    const detect = vi.fn().mockResolvedValue([]); // never finds a code
    setBarcodeDetector(class {
      detect = detect;
    });
    const { stream, tracks } = fakeStream(2);
    const onDecode = vi.fn();

    const scanner = startScan({
      video: {} as HTMLVideoElement,
      stream,
      onDecode,
      intervalMs: 5,
    });
    expect(scanner).not.toBeNull();

    await vi.waitFor(() => expect(detect).toHaveBeenCalled());
    scanner!.stop();

    for (const t of tracks) expect(t.stop).toHaveBeenCalledTimes(1);
    expect(onDecode).not.toHaveBeenCalled();

    // The loop must not keep polling after stop(): record the count now,
    // wait past several intervals, assert it did not grow.
    const callsAtStop = detect.mock.calls.length;
    await new Promise((r) => setTimeout(r, 50));
    expect(detect.mock.calls.length).toBe(callsAtStop);
  });

  it("stop() is idempotent: double/triple-stop never re-stops tracks", async () => {
    const detect = vi.fn().mockResolvedValue([]);
    setBarcodeDetector(class {
      detect = detect;
    });
    const { stream, tracks } = fakeStream(1);
    const scanner = startScan({
      video: {} as HTMLVideoElement,
      stream,
      onDecode: vi.fn(),
      intervalMs: 5,
    });
    await vi.waitFor(() => expect(detect).toHaveBeenCalled());
    scanner!.stop();
    scanner!.stop();
    scanner!.stop();
    for (const t of tracks) expect(t.stop).toHaveBeenCalledTimes(1);
  });

  it("stop() after an auto-stop decode is a no-op (no double release)", async () => {
    const detect = vi.fn().mockResolvedValue([{ rawValue: "v1:C:k==" }]);
    setBarcodeDetector(class {
      detect = detect;
    });
    const { stream, tracks } = fakeStream(2);
    const onDecode = vi.fn();
    const scanner = startScan({
      video: {} as HTMLVideoElement,
      stream,
      onDecode,
    });
    await vi.waitFor(() => expect(onDecode).toHaveBeenCalledTimes(1));
    scanner!.stop(); // caller may also stop; must not re-release
    for (const t of tracks) expect(t.stop).toHaveBeenCalledTimes(1);
    expect(onDecode).toHaveBeenCalledTimes(1);
  });

  it("rapid start/stop churn leaks no tracks across many scanners", async () => {
    const detect = vi.fn().mockResolvedValue([]);
    setBarcodeDetector(class {
      detect = detect;
    });
    const all: { stop: ReturnType<typeof vi.fn> }[] = [];
    for (let i = 0; i < 25; i++) {
      const { stream, tracks } = fakeStream(2);
      all.push(...tracks);
      const s = startScan({
        video: {} as HTMLVideoElement,
        stream,
        onDecode: vi.fn(),
        intervalMs: 1,
      });
      s!.stop();
    }
    // Every track from every scanner released exactly once.
    for (const t of all) expect(t.stop).toHaveBeenCalledTimes(1);
  });

  it("a transient detect() rejection does not kill the loop or leak", async () => {
    // First call throws (video not ready), later calls succeed.
    const detect = vi
      .fn()
      .mockRejectedValueOnce(new Error("not ready"))
      .mockResolvedValue([{ rawValue: "v1:C:k==" }]);
    setBarcodeDetector(class {
      detect = detect;
    });
    const { stream, tracks } = fakeStream(1);
    const onDecode = vi.fn();
    startScan({
      video: {} as HTMLVideoElement,
      stream,
      onDecode,
      intervalMs: 5,
    });
    await vi.waitFor(() => expect(onDecode).toHaveBeenCalledTimes(1));
    expect(onDecode).toHaveBeenCalledWith("v1:C:k==");
    for (const t of tracks) expect(t.stop).toHaveBeenCalledTimes(1);
  });

  it("forwards the RAW decoded string verbatim (no trim/truncation)", async () => {
    // A payload with special chars, padding, and surrounding spaces the
    // camera path must NOT alter (parsing is PRD-21's job).
    const raw = "v1:CODE-123:AB+/cd==EF+/gh==";
    const detect = vi.fn().mockResolvedValue([{ rawValue: raw }]);
    setBarcodeDetector(class {
      detect = detect;
    });
    const { stream } = fakeStream(1);
    const onDecode = vi.fn();
    startScan({ video: {} as HTMLVideoElement, stream, onDecode });
    await vi.waitFor(() => expect(onDecode).toHaveBeenCalledTimes(1));
    expect(onDecode).toHaveBeenCalledWith(raw);
  });
});
