import { createSignal, onCleanup, onMount } from "solid-js";
import {
  applyEffectiveTheme,
  nextChoice,
  readStoredChoice,
  resolveEffectiveTheme,
  systemPrefersDark,
  writeStoredChoice,
  type ThemeChoice,
} from "~/lib/theme";

const LABELS: Record<ThemeChoice, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export default function ThemeToggle() {
  const [choice, setChoice] = createSignal<ThemeChoice>("system");

  const sync = (c: ThemeChoice) => {
    applyEffectiveTheme(resolveEffectiveTheme(c, systemPrefersDark()));
  };

  onMount(() => {
    const stored = readStoredChoice();
    setChoice(stored);
    sync(stored);

    // In "system" mode, follow OS preference changes live.
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (choice() === "system") sync("system");
    };
    mq.addEventListener("change", onChange);
    onCleanup(() => mq.removeEventListener("change", onChange));
  });

  const cycle = () => {
    const next = nextChoice(choice());
    setChoice(next);
    writeStoredChoice(next);
    sync(next);
  };

  return (
    <button
      type="button"
      class="theme-toggle"
      onClick={cycle}
      aria-label={`Theme: ${LABELS[choice()]}. Click to change.`}
    >
      {LABELS[choice()]}
    </button>
  );
}
