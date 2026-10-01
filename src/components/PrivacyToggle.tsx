import { choiceSheet } from "~/components/ConfirmSheet";
import { EyeIcon } from "~/components/Icons";
import { privateMode, reveal, setPrivateMode, togglePrivateMode } from "~/lib/privacy";

// The one private-mode switch: an eye in the app bar (DESIGN §15 amended).
export default function PrivacyToggle() {
  return (
    <button
      type="button"
      class="privacy-toggle"
      classList={{ "is-on": privateMode() }}
      aria-pressed={privateMode()}
      aria-label={privateMode() ? "Private mode on. Tap to turn off" : "Private mode off. Tap to turn on"}
      title={privateMode() ? "Private mode on" : "Private mode off"}
      onClick={() => togglePrivateMode()}
    >
      <EyeIcon closed={privateMode()} />
      <span class="privacy-toggle-label">{privateMode() ? "Private" : ""}</span>
    </button>
  );
}

// Tapping a veiled item: show just this one, or switch the mode off.
export async function askReveal(id: string, what = "note"): Promise<void> {
  const choice = await choiceSheet({
    title: `Show this ${what}?`,
    body: "Private mode is on. This shows just this one until you close the app.",
    confirmLabel: "Show this one",
    altLabel: "Turn private mode off",
    cancelLabel: "Keep hidden",
  });
  if (choice === "confirm") reveal(id);
  if (choice === "alt") setPrivateMode(false);
}
