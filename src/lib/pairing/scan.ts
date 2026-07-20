// Thin wrapper around the native BarcodeDetector API for scanning QR
// codes from a camera stream.
//
// SSR-safety: this app prerenders in a separate Node process where
// `window`/`navigator`/`BarcodeDetector` do not exist. Nothing here may
// touch those globals at module load — every access is lazy, inside a
// function guarded for `typeof ... === "undefined"`.
//
// Scope: decode a raw string only. Payload parsing/validation is PRD-19
// (`parseInvitePayload`); redemption + key storage is PRD-21.

// Minimal structural types for BarcodeDetector — it is not (yet) in the
// TS DOM lib. We only declare the surface we use.
interface DetectedBarcodeLike {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcodeLike[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

function getBarcodeDetectorCtor(): BarcodeDetectorCtor | undefined {
  if (typeof globalThis === "undefined") return undefined;
  const ctor = (globalThis as { BarcodeDetector?: unknown }).BarcodeDetector;
  return typeof ctor === "function"
    ? (ctor as BarcodeDetectorCtor)
    : undefined;
}

// True when the browser exposes the native BarcodeDetector API. Never
// throws; returns false during SSR/prerender or on unsupported browsers.
// When false, QRScanner uses the html5-qrcode fallback (scan-fallback.ts),
// so a scanner is now always available in the browser.
export function isSupported(): boolean {
  return getBarcodeDetectorCtor() !== undefined;
}

// Clearer alias for the native check now that a fallback path exists.
export const isNativeSupported = isSupported;

export interface Scanner {
  // Stop the detector loop and stop every track on the MediaStream so the
  // camera is released. Idempotent.
  stop(): void;
}

export interface StartScanOptions {
  // The <video> element already playing the camera stream.
  video: HTMLVideoElement;
  // The MediaStream backing the video, so we can release its tracks.
  stream: MediaStream;
  // Called with the raw decoded string on the first successful decode.
  onDecode: (raw: string) => void;
  // Polling interval between detection attempts, in ms. Default 300.
  intervalMs?: number;
}

// Start a detection loop against a video element. Returns a Scanner whose
// `stop()` halts the loop and releases the camera. Emits the first decoded
// value via `onDecode`, then stops itself. Returns null if BarcodeDetector
// is unavailable (caller should have checked `isSupported()` first).
export function startScan(options: StartScanOptions): Scanner | null {
  const Ctor = getBarcodeDetectorCtor();
  if (!Ctor) return null;

  const { video, stream, onDecode, intervalMs = 300 } = options;
  const detector = new Ctor({ formats: ["qr_code"] });

  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const releaseStream = () => {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
    releaseStream();
  };

  const tick = async () => {
    if (stopped) return;
    try {
      const codes = await detector.detect(video);
      if (stopped) return;
      const first = codes[0];
      if (first && first.rawValue) {
        onDecode(first.rawValue);
        stop();
        return;
      }
    } catch {
      // Transient detection error (e.g. video not ready yet). Keep polling.
    }
    if (!stopped) {
      timer = setTimeout(() => void tick(), intervalMs);
    }
  };

  void tick();

  return { stop };
}
