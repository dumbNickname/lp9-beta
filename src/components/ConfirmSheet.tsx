import { createSignal, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";

// In-app confirm sheet replacing window.confirm (PRD-44). One global
// instance; `confirmSheet()` resolves true/false. Falls back to
// window.confirm when the host isn't mounted (tests, early boot).
export interface ConfirmOptions {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

interface Pending extends ConfirmOptions {
  // Optional middle choice (e.g. "Turn private mode off").
  altLabel?: string;
  resolve: (choice: Choice) => void;
}

type Choice = "confirm" | "alt" | "cancel";

const [pending, setPending] = createSignal<Pending | null>(null);
let mounted = false;

export function confirmSheet(opts: ConfirmOptions): Promise<boolean> {
  return choiceSheet(opts).then((c) => c === "confirm");
}

// Three-way variant: confirm / alt / cancel.
export function choiceSheet(opts: ConfirmOptions & { altLabel?: string }): Promise<Choice> {
  if (!mounted) {
    const ok =
      typeof window !== "undefined" &&
      window.confirm([opts.title, opts.body].filter(Boolean).join("\n\n"));
    return Promise.resolve(ok ? "confirm" : "cancel");
  }
  pending()?.resolve("cancel");
  return new Promise((resolve) => setPending({ ...opts, resolve }));
}

export default function ConfirmHost() {
  mounted = true;
  onCleanup(() => {
    mounted = false;
    pending()?.resolve("cancel");
    setPending(null);
  });

  let confirmBtn: HTMLButtonElement | undefined;
  let lastFocus: Element | null = null;

  const close = (choice: Choice) => {
    const p = pending();
    setPending(null);
    p?.resolve(choice);
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close("cancel");
    }
  };

  return (
    <Show when={pending()}>
      {(p) => {
        lastFocus = document.activeElement;
        queueMicrotask(() => confirmBtn?.focus());
        return (
          <Portal>
            <div class="sheet-backdrop" onClick={() => close("cancel")} />
            <div
              class="sheet"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="sheet-title"
              aria-describedby={p().body ? "sheet-body" : undefined}
              onKeyDown={onKey}
            >
              <h2 id="sheet-title" class="sheet-title">{p().title}</h2>
              <Show when={p().body}>
                <p id="sheet-body" class="sheet-body">{p().body}</p>
              </Show>
              <div class="sheet-actions">
                <button
                  ref={confirmBtn}
                  type="button"
                  classList={{ "is-danger": p().tone === "danger" }}
                  onClick={() => close("confirm")}
                >
                  {p().confirmLabel ?? "OK"}
                </button>
                <Show when={p().altLabel}>
                  <button type="button" class="quiet" onClick={() => close("alt")}>
                    {p().altLabel}
                  </button>
                </Show>
                <button type="button" class="quiet" onClick={() => close("cancel")}>
                  {p().cancelLabel ?? "Cancel"}
                </button>
              </div>
            </div>
          </Portal>
        );
      }}
    </Show>
  );
}
