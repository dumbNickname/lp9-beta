import { Show } from "solid-js";
import { privateMode, togglePrivateMode } from "~/lib/privacy";

export default function PrivacyToggle() {
  return (
    <button
      type="button"
      class="privacy-toggle quiet small"
      aria-pressed={privateMode()}
      title={privateMode() ? "Comments hidden. Tap to show." : "Comments visible. Tap to hide."}
      onClick={() => togglePrivateMode()}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" class="privacy-icon">
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
        <Show when={privateMode()}>
          <path d="M3 3l18 18" />
        </Show>
      </svg>
      <span>{privateMode() ? "Private mode on" : "Private mode off"}</span>
    </button>
  );
}
