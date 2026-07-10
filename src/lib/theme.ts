export type ThemeChoice = "light" | "dark" | "system";
export type EffectiveTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
const CHOICES: ThemeChoice[] = ["light", "dark", "system"];

// Coerce any stored value (possibly garbage) into a valid choice.
export function normalizeChoice(value: unknown): ThemeChoice {
  return CHOICES.includes(value as ThemeChoice)
    ? (value as ThemeChoice)
    : "system";
}

// Given the user's choice and the OS preference, resolve what to paint.
export function resolveEffectiveTheme(
  choice: ThemeChoice,
  systemPrefersDark: boolean,
): EffectiveTheme {
  if (choice === "system") return systemPrefersDark ? "dark" : "light";
  return choice;
}

// Cycle order for the toggle: light -> dark -> system -> light ...
export function nextChoice(choice: ThemeChoice): ThemeChoice {
  const i = CHOICES.indexOf(choice);
  return CHOICES[(i + 1) % CHOICES.length]!;
}

// --- Browser-side helpers (guard for SSR / private mode where storage
// may be unavailable) ---

export function readStoredChoice(): ThemeChoice {
  try {
    return normalizeChoice(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function writeStoredChoice(choice: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage unavailable (private mode etc.) — degrade silently.
  }
}

export function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function applyEffectiveTheme(theme: EffectiveTheme): void {
  document.documentElement.dataset.theme = theme;
}

// Inline script injected into <head> before paint to set the correct
// data-theme with no flash. Kept dependency-free and defensive: any
// failure falls back to light. Mirrors the pure functions above.
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var c = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    if (c !== "light" && c !== "dark" && c !== "system") c = "system";
    var dark = c === "dark" ||
      (c === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch (e) {
    document.documentElement.dataset.theme = "light";
  }
})();
`.trim();
