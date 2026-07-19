import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { parseInvitePayload } from "~/lib/pairing/qr";
import { isSupported, startScan, type Scanner } from "~/lib/pairing/scan";

interface QRScannerProps {
  // Called with the raw invite payload string on a successful scan or a
  // valid manual paste. Parsing/redemption is the caller's job (PRD-21);
  // this component only guarantees the string parses via PRD-19 when it
  // originates from manual entry.
  onDecode: (payload: string) => void;
}

type CameraState = "idle" | "starting" | "running" | "denied" | "unsupported";

export default function QRScanner(props: QRScannerProps) {
  const [cameraState, setCameraState] = createSignal<CameraState>("idle");
  const [manual, setManual] = createSignal("");
  const [manualError, setManualError] = createSignal("");

  let video: HTMLVideoElement | undefined;
  let scanner: Scanner | undefined;
  let stream: MediaStream | undefined;

  const cleanup = () => {
    scanner?.stop();
    scanner = undefined;
    // scanner.stop() releases tracks, but if we failed before startScan we
    // may still hold a raw stream — release it defensively.
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      stream = undefined;
    }
  };

  onMount(async () => {
    if (!isSupported()) {
      setCameraState("unsupported");
      return;
    }
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setCameraState("unsupported");
      return;
    }

    setCameraState("starting");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      stream = media;
      if (!video) {
        // Component unmounted before the video element resolved.
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
          onDecode: (raw) => {
            cleanup();
            setCameraState("idle");
            props.onDecode(raw);
          },
        }) ?? undefined;
      setCameraState("running");
    } catch {
      // Permission denied or no camera. Fall through to manual entry.
      cleanup();
      setCameraState("denied");
    }
  });

  onCleanup(cleanup);

  const submitManual = (e: Event) => {
    e.preventDefault();
    const payload = manual().trim();
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

      <Show when={cameraState() === "denied"}>
        <p class="qr-scanner-notice" role="status">
          Camera access is unavailable. Paste the invite below instead.
        </p>
      </Show>

      <Show when={cameraState() === "unsupported"}>
        <p class="qr-scanner-notice" role="status">
          Scanning is not supported on this device. Paste the invite below
          instead.
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
