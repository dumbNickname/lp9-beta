import { createSignal, onMount, Show } from "solid-js";
import QRCode from "qrcode";
import { buildInvitePayload, buildInviteUrl } from "~/lib/pairing/qr";

interface InviteQRProps {
  // The pairing code. Used only to build the QR + invite link; it is NOT
  // shown as a standalone code (it cannot pair on its own — the key lives in
  // the link — and it confused testers). See PRD-25 (D-25.3).
  code: string;
  // The base64-encoded AES key that rides in the invite.
  keyBase64: string;
}

export default function InviteQR(props: InviteQRProps) {
  const [error, setError] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  let canvas: HTMLCanvasElement | undefined;
  let urlField: HTMLTextAreaElement | undefined;
  let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

  // The wire payload (`v1:<code>:<keyBase64>`) rides inside the deep-link
  // URL fragment. The QR encodes the URL so iOS native Camera recognizes it.
  const payload = () => buildInvitePayload(props.code, props.keyBase64);
  const inviteUrl = () =>
    buildInviteUrl(payload(), {
      origin:
        typeof window !== "undefined" && window.location
          ? window.location.origin
          : undefined,
    });

  onMount(() => {
    if (!canvas) return;
    QRCode.toCanvas(canvas, inviteUrl(), { errorCorrectionLevel: "M" }).catch(
      () => setError(true),
    );
  });

  const flagCopied = () => {
    setCopied(true);
    if (copyResetTimer !== undefined) clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => setCopied(false), 2000);
  };

  const selectField = () => {
    try {
      urlField?.focus();
      urlField?.select();
    } catch {
      // Selection unavailable; nothing more to do.
    }
  };

  const copyInvite = async () => {
    const text = inviteUrl();
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(text);
        flagCopied();
        return;
      }
    } catch {
      // Clipboard API blocked (permissions / insecure context). Fall back.
    }
    // Defensive fallback: select the field so the user can copy manually.
    selectField();
    flagCopied();
  };

  return (
    <div class="invite-qr">
      <Show
        when={!error()}
        fallback={
          <p class="error" role="alert">
            Could not render the QR code. Copy the invite link below to pair.
          </p>
        }
      >
        <canvas ref={canvas} aria-label="Pairing QR code" />
      </Show>

      <label class="invite-qr-link">
        <span class="invite-qr-link-label">Invite link</span>
        <textarea
          ref={urlField}
          class="invite-qr-link-field"
          readonly
          rows={3}
          value={inviteUrl()}
          onFocus={selectField}
          aria-label="Full invite link"
        />
      </label>

      <button
        type="button"
        class="invite-qr-copy"
        onClick={() => void copyInvite()}
      >
        {copied() ? "Copied" : "Copy invite link"}
      </button>
    </div>
  );
}
