import { createSignal, createUniqueId, onCleanup, onMount, Show } from "solid-js";
import { normalizeScannedInput, parseInvitePayload } from "~/lib/pairing/qr";
import { isNativeSupported, startScan, type Scanner } from "~/lib/pairing/scan";
import { startFallbackScan } from "~/lib/pairing/scan-fallback";

interface QRScannerProps {
  // Called with the raw decoded string on a successful scan or a valid
  // manual paste. The caller (PairFlow) normalizes URL-or-payload and
  // redeems (PRD-21); manual entry is validated here before it fires.
  onDecode: (raw: string) => void;
}

type CameraState = "idle" | "starting" | "running" | "denied";

export default function QRScanner(props: QRScannerProps) {
  const [cameraState, setCameraState] = createSignal<CameraState>("idle");
  const [manual, setManual] = createSignal("");
  const [manualError, setManualError] = createSignal("");

  // Unique id so the html5-qrcode fallback can address its mount container.
  const fallbackContainerId = `qr-fallback-${createUniqueId()}`;

  let video: HTMLVideoElement | undefined;
  let fallbackContainer: HTMLDivElement | undefined;
  let scanner: Scanner | undefined;
  let stream: MediaStream | undefined;
  let disposed = false;

  const cleanup = () => {
    scanner?.stop();
    scanner = undefined;
    // scanner.stop() releases tracks (native path), but if we failed before
    // startScan we may still hold a raw stream — release it defensively.
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = undefined;
    }
  };

  const onDecoded = (raw: string) => {
    cleanup();
    setCameraState("idle");
    props.onDecode(raw);
  };

  // Native BarcodeDetector path: we own the <video> + MediaStream.
  const startNative = async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraState("denied");
      return;
    }
    setCameraState("starting");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream = media;
      if (!video || disposed) {
        for (const track of media.getTracks()) track.stop();
        stream = undefined;
        return;
      }
      video.srcObject = media;
      await video.play().catch(() => undefined);
      scanner =
        startScan({
          video,
          stream: media,
          onDecode: onDecoded,
        }) ?? undefined;
      setCameraState("running");
    } catch {
      cleanup();
      setCameraState("denied");
    }
  };

  // html5-qrcode fallback path: the library owns its camera + video element,
  // rendered into our container. Used when BarcodeDetector is unsupported.
  const startFallback = async () => {
    if (!fallbackContainer || disposed) {
      setCameraState("denied");
      return;
    }
    setCameraState("starting");
    try {
      scanner = await startFallbackScan({
        container: fallbackContainer,
        onDecode: onDecoded,
      });
      if (disposed) {
        scanner.stop();
        scanner = undefined;
        return;
      }
      setCameraState("running");
    } catch {
      cleanup();
      setCameraState("denied");
    }
  };

  onMount(() => {
    if (isNativeSupported()) {
      void startNative();
    } else {
      void startFallback();
    }
  });

  onCleanup(() => {
    disposed = true;
    cleanup();
  });

  const submitManual = (e: Event) => {
    e.preventDefault();
    const payload = normalizeScannedInput(manual());
    if (!payload) {
      setManualError("Paste an invite to continue.");
      return;
    }
    if (parseInvitePayload(payload) === null) {
      setManualError("That does not look like a valid invite.");
      return;
    }
    setManualError("");
    props.onDecode(payload);
  };

  return (
    <div class="qr-scanner">
      <Show when={cameraState() === "running" || cameraState() === "starting"}>
        <div class="qr-scanner-camera">
          <video ref={video} playsinline muted aria-label="Camera preview" />
        </div>
      </Show>

      {/* Fallback mount target — html5-qrcode renders its own video here. */}
      <div
        ref={fallbackContainer}
        id={fallbackContainerId}
        class="qr-scanner-fallback"
      />

      <Show when={cameraState() === "denied"}>
        <p class="qr-scanner-notice" role="status">
          Camera access is unavailable. Paste the invite below instead.
        </p>
      </Show>

      <form class="qr-scanner-manual" onSubmit={submitManual}>
        <label>
          Paste invite
          <input
            type="text"
            value={manual()}
            onInput={(e) => {
              setManual(e.currentTarget.value);
              if (manualError()) setManualError("");
            }}
            placeholder="Paste the invite your partner shared"
            autocomplete="off"
            spellcheck={false}
          />
        </label>

        <Show when={manualError()}>
          <p class="error" role="alert">
            {manualError()}
          </p>
        </Show>

        <button type="submit">Continue</button>
      </form>
    </div>
  );
}
