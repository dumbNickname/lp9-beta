// html5-qrcode fallback scanner (PRD-24) — used only when the native
// BarcodeDetector API is unavailable (notably iOS Safari/Chrome).
//
// The library is LAZY dynamic-imported inside `startFallbackScan` so it is
// never in the initial bundle and never loads during SSR/prerender (the
// prerender runs in a separate Node process with no `window`/DOM). Nothing
// here touches browser globals at module load.
//
// Contract mirrors the native `Scanner` in `./scan`: emit the first decoded
// raw string via `onDecode`, expose an idempotent `stop()` that fully
// releases the camera. Unlike the native path, html5-qrcode manages its own
// camera stream and renders into a container element it owns (by id), so the
// caller passes a mount container instead of a `<video>` + `MediaStream`.

import type { Scanner } from "./scan";

// Minimal structural type for the html5-qrcode surface we use. The library
// ships its own types, but importing them eagerly would pull the module into
// the graph; a local structural type keeps the import fully lazy.
interface Html5QrcodeLike {
  start(
    cameraIdOrConfig: { facingMode: string },
    config: { fps?: number; qrbox?: number } | undefined,
    onSuccess: (decodedText: string) => void,
    onError: ((errorMessage: string) => void) | undefined,
  ): Promise<null>;
  stop(): Promise<void>;
  clear(): void;
}
interface Html5QrcodeCtor {
  new (elementId: string, verbose?: boolean): Html5QrcodeLike;
}

export interface StartFallbackScanOptions {
  // The container element the library renders its video into. It must have a
  // non-empty `id`; the library addresses the element by id.
  container: HTMLElement;
  // Called with the raw decoded string on the first successful decode.
  onDecode: (raw: string) => void;
  // Called if the camera fails to start (permission denied / no camera).
  onError?: (err: unknown) => void;
}

// Start the html5-qrcode camera against `container`. Resolves once scanning
// has started (or rejects to `onError`). Returns a Scanner whose `stop()`
// halts scanning and releases the camera; idempotent. Emits the first
// decoded value via `onDecode`, then stops itself.
export async function startFallbackScan(
  options: StartFallbackScanOptions,
): Promise<Scanner> {
  const { container, onDecode, onError } = options;

  const mod = (await import("html5-qrcode")) as unknown as {
    Html5Qrcode: Html5QrcodeCtor;
  };
  const Html5Qrcode = mod.Html5Qrcode;

  const instance = new Html5Qrcode(container.id, false);

  let stopped = false;
  let started = false;
  let decoded = false;

  // Fully release the camera. html5-qrcode's stop() halts the stream and
  // clear() tears down the rendered DOM. Both are guarded and idempotent.
  const releaseAsync = async () => {
    try {
      if (started) await instance.stop();
    } catch {
      // Already stopped / not running.
    }
    try {
      instance.clear();
    } catch {
      // Nothing rendered.
    }
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    void releaseAsync();
  };

  try {
    await instance.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText: string) => {
        if (decoded || stopped) return;
        decoded = true;
        onDecode(decodedText);
        stop();
      },
      undefined,
    );
    started = true;
    // If stop() was called while start() was in flight, honor it now.
    if (stopped) void releaseAsync();
  } catch (err) {
    stopped = true;
    onError?.(err);
    throw err;
  }

  return { stop };
}
