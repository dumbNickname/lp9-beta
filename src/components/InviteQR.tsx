import { createSignal, onMount, Show } from "solid-js";
import QRCode from "qrcode";

interface InviteQRProps {
  // The full invite payload to encode (e.g. `v1:<code>:<keyBase64>`).
  payload: string;
  // The human-readable pairing code shown as a manual fallback.
  code: string;
}

export default function InviteQR(props: InviteQRProps) {
  const [error, setError] = createSignal(false);
  let canvas: HTMLCanvasElement | undefined;

  onMount(() => {
    if (!canvas) return;
    QRCode.toCanvas(canvas, props.payload, { errorCorrectionLevel: "M" }).catch(
      () => setError(true),
    );
  });

  return (
    <div class="invite-qr">
      <Show
        when={!error()}
        fallback={
          <p class="error" role="alert">
            Could not render the QR code. Use the code below to pair.
          </p>
        }
      >
        <canvas ref={canvas} aria-label="Pairing QR code" />
      </Show>
      <p class="invite-qr-code">{props.code}</p>
    </div>
  );
}
