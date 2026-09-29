import { createSignal } from "solid-js";

// Shoulder-surf veil (DESIGN.md §15). In-memory only: every app load
// starts private (§15c); toggling stays for the rest of the session.
const [privateMode, setPrivateMode] = createSignal(true);

export function togglePrivateMode(): void {
  setPrivateMode((v) => !v);
}

export { privateMode, setPrivateMode };
