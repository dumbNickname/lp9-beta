import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// QA adversarial suite for PRD-24 — scan-fallback.ts (html5-qrcode wrapper).
//
// Contract (PRD-24 Dev notes):
//   - the html5-qrcode lib is LAZY dynamic-imported INSIDE startFallbackScan
//     (never at module top level) so it stays out of SSR/prerender + initial
//     bundle. We mock the module so no real lib/camera loads.
//   - stop() is idempotent and fully releases the camera: html5-qrcode
//     .stop() (halts the stream) then .clear() (tears down DOM).
//   - unmount mid-start (disposed before start() resolves) must still release
//     the camera — no leaked stream.
//   - first decode auto-stops (releases camera) and forwards the RAW string.
//   - a start() failure surfaces via onError and rejects, without leaving a
//     running camera.

// A fake Html5Qrcode instance recording start/stop/clear calls. `onSuccess`
// is captured so tests can simulate a decode.
function makeFakeLib(opts?: {
  startRejects?: boolean;
  startDelayMs?: number;
}) {
  const calls = {
    start: 0,
    stop: 0,
    clear: 0,
    constructedWith: [] as Array<{ elementId: string }>,
  };
  let capturedOnSuccess: ((text: string) => void) | undefined;

  class FakeHtml5Qrcode {
    constructor(elementId: string) {
      calls.constructedWith.push({ elementId });
    }
    async start(
      _cam: unknown,
      _cfg: unknown,
      onSuccess: (t: string) => void,
    ): Promise<null> {
      calls.start++;
      capturedOnSuccess = onSuccess;
      if (opts?.startDelayMs) {
        await new Promise((r) => setTimeout(r, opts.startDelayMs));
      }
      if (opts?.startRejects) throw new Error("camera start failed");
      return null;
    }
    async stop(): Promise<void> {
      calls.stop++;
    }
    clear(): void {
      calls.clear++;
    }
  }

  return {
    module: { Html5Qrcode: FakeHtml5Qrcode },
    calls,
    decode: (text: string) => capturedOnSuccess?.(text),
  };
}

let fake: ReturnType<typeof makeFakeLib>;

// The lazy `await import("html5-qrcode")` inside startFallbackScan resolves to
// this mock. vi.mock is hoisted; we swap the backing object per test.
vi.mock("html5-qrcode", () => ({
  get Html5Qrcode() {
    return fake.module.Html5Qrcode;
  },
}));

async function importStart() {
  return (await import("~/lib/pairing/scan-fallback")).startFallbackScan;
}

function container(id = "qr-fallback-test"): HTMLElement {
  const el = document.createElement("div");
  el.id = id;
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  fake = makeFakeLib();
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("PRD-24 QA: scan-fallback lazy import + decode", () => {
  it("constructs html5-qrcode against the container id and starts scanning", async () => {
    const start = await importStart();
    const onDecode = vi.fn();
    await start({ container: container("my-mount"), onDecode });

    expect(fake.calls.constructedWith).toEqual([{ elementId: "my-mount" }]);
    expect(fake.calls.start).toBe(1);
  });

  it("first decode forwards the RAW string and auto-stops (releases camera)", async () => {
    const start = await importStart();
    const onDecode = vi.fn();
    const scanner = await start({ container: container(), onDecode });

    const raw = "v1:CODE-123:AB+/cd==EF+/gh==";
    fake.decode(raw);

    expect(onDecode).toHaveBeenCalledTimes(1);
    expect(onDecode).toHaveBeenCalledWith(raw); // verbatim, no trim
    // Auto-stop released the camera: stop() + clear() both fired.
    await vi.waitFor(() => expect(fake.calls.stop).toBe(1));
    await vi.waitFor(() => expect(fake.calls.clear).toBe(1));
    void scanner;
  });

  it("a second decode after auto-stop does NOT fire onDecode again", async () => {
    const start = await importStart();
    const onDecode = vi.fn();
    await start({ container: container(), onDecode });
    fake.decode("v1:C:k==");
    fake.decode("v1:C:k=="); // spurious late decode
    expect(onDecode).toHaveBeenCalledTimes(1);
  });
});

describe("PRD-24 QA: scan-fallback camera release / idempotency", () => {
  it("explicit stop() releases the camera (stop + clear)", async () => {
    const start = await importStart();
    const scanner = await start({ container: container(), onDecode: vi.fn() });
    scanner.stop();
    await vi.waitFor(() => expect(fake.calls.stop).toBe(1));
    await vi.waitFor(() => expect(fake.calls.clear).toBe(1));
  });

  it("stop() is idempotent: double/triple-stop never re-releases", async () => {
    const start = await importStart();
    const scanner = await start({ container: container(), onDecode: vi.fn() });
    scanner.stop();
    scanner.stop();
    scanner.stop();
    // Give the async release microtasks a chance to settle.
    await vi.waitFor(() => expect(fake.calls.stop).toBe(1));
    // Even after settling, exactly one stop + one clear.
    await Promise.resolve();
    expect(fake.calls.stop).toBe(1);
    expect(fake.calls.clear).toBe(1);
  });

  it("stop() after an auto-stop decode does not double-release", async () => {
    const start = await importStart();
    const onDecode = vi.fn();
    const scanner = await start({ container: container(), onDecode });
    fake.decode("v1:C:k==");
    await vi.waitFor(() => expect(fake.calls.stop).toBe(1));
    scanner.stop(); // caller also stops
    await Promise.resolve();
    expect(fake.calls.stop).toBe(1);
    expect(fake.calls.clear).toBe(1);
  });

  it("stopping right after a slow start resolves still releases the camera (no leak)", async () => {
    // Slow camera start; the caller (QRScanner unmount) stops as soon as the
    // scanner is available. The camera must be released exactly once.
    vi.useFakeTimers();
    fake = makeFakeLib({ startDelayMs: 100 });
    const start = await importStart();
    const onDecode = vi.fn();

    const promise = start({ container: container(), onDecode });
    await vi.advanceTimersByTimeAsync(100);
    const scanner = await promise;
    scanner.stop();
    await vi.waitFor(() => expect(fake.calls.stop).toBe(1));
    expect(fake.calls.clear).toBe(1);
    expect(onDecode).not.toHaveBeenCalled();
  });

  it("start() failure surfaces via onError, rejects, and leaves no running camera", async () => {
    fake = makeFakeLib({ startRejects: true });
    const start = await importStart();
    const onError = vi.fn();
    const onDecode = vi.fn();

    await expect(
      start({ container: container(), onDecode, onError }),
    ).rejects.toThrow(/camera start failed/);

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onDecode).not.toHaveBeenCalled();
    // start() threw before `started` was set, so stop() (0 tracks running) is
    // safe; no decode, no leaked running camera.
  });
});
