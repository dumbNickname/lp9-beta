import { createSignal, For, Show } from "solid-js";
import HeartIcon from "~/components/HeartIcon";
import { saveProfile } from "~/lib/stores/profile";

export const NAME_MAX = 50;

export function initial(name: string): string {
  const ch = Array.from(name.trim())[0];
  return ch ? ch.toLocaleUpperCase() : "?";
}

export interface PairOption {
  id: string;
  partnerName: string;
}

interface Props {
  myName: string;
  partnerName: string | null;
  // PRD-43: other pairs on this account + actions.
  pairs?: PairOption[];
  currentId?: string;
  onSwitch?: (id: string) => void;
  onAddPartner?: () => void;
  // PRD-49: open straight into the name editor; called on save/cancel.
  startEditing?: boolean;
  onDone?: () => void;
}

// "Who am I paired with" at a glance + edit own display name (PRD-34).
export default function PairBadge(props: Props) {
  // eslint-disable-next-line solid/reactivity -- initial mode only
  const [editing, setEditing] = createSignal(!!props.startEditing);
  // eslint-disable-next-line solid/reactivity -- initial value only
  const [draft, setDraft] = createSignal(props.startEditing ? props.myName : "");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [menuOpen, setMenuOpen] = createSignal(false);

  const partner = () => props.partnerName || "your partner";

  const start = () => {
    setDraft(props.myName);
    setError("");
    setEditing(true);
  };

  const save = async (e: Event) => {
    e.preventDefault();
    const name = draft().trim();
    if (!name) {
      setError("Your name can't be empty.");
      return;
    }
    if (name.length > NAME_MAX) {
      setError(`Keep it to ${NAME_MAX} characters or fewer.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveProfile({ display_name: name });
      setEditing(false);
      props.onDone?.();
    } catch {
      setError("Couldn't save. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section class="pair-badge" aria-label="Your pairing">
      <div class="pair-avatars" aria-hidden="true">
        <span class="avatar avatar--me">{initial(props.myName)}</span>
        <span class="avatar-heart">
          <HeartIcon filled />
        </span>
        <span class="avatar avatar--partner">{initial(partner())}</span>
      </div>

      <Show
        when={editing()}
        fallback={
          <div class="pair-names">
            <p class="pair-title">
              {props.myName} <span class="amp">&amp;</span> {partner()}
            </p>
            <p class="pair-sub">
              <Show when={(props.pairs?.length ?? 0) > 1} fallback={<>Paired. </>}>
                {props.pairs!.length} pairs.{" "}
              </Show>
              <button type="button" class="link-button" onClick={start}>
                Edit my name
              </button>
              <Show when={props.onSwitch || props.onAddPartner}>
                {" · "}
                <button
                  type="button"
                  class="link-button"
                  aria-expanded={menuOpen()}
                  aria-controls="pair-menu"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  Switch / new pair
                </button>
              </Show>
            </p>
            <Show when={menuOpen()}>
              <ul id="pair-menu" class="pair-menu">
                <For each={props.pairs ?? []}>
                  {(p) => (
                    <li>
                      <button
                        type="button"
                        class="pair-menu-item"
                        aria-current={p.id === props.currentId ? "true" : undefined}
                        onClick={() => {
                          setMenuOpen(false);
                          props.onSwitch?.(p.id);
                        }}
                      >
                        <span class="avatar avatar--partner avatar--sm">{initial(p.partnerName)}</span>
                        {p.partnerName}
                        <Show when={p.id === props.currentId}>
                          <span class="note-badge">current</span>
                        </Show>
                      </button>
                    </li>
                  )}
                </For>
                <Show when={props.onAddPartner}>
                  <li>
                    <button
                      type="button"
                      class="pair-menu-item pair-menu-add"
                      onClick={() => {
                        setMenuOpen(false);
                        props.onAddPartner?.();
                      }}
                    >
                      + New pair (a separate notebook)
                    </button>
                  </li>
                </Show>
              </ul>
            </Show>
          </div>
        }
      >
        <form class="pair-edit" onSubmit={save}>
          <label>
            Your name (what {partner()} sees)
            <input
              type="text"
              value={draft()}
              maxLength={NAME_MAX}
              onInput={(e) => setDraft(e.currentTarget.value)}
              disabled={busy()}
              autocomplete="nickname"
            />
          </label>
          <Show when={error()}>
            <p class="error" role="alert">{error()}</p>
          </Show>
          <div class="pair-edit-actions">
            <button type="submit" class="small" disabled={busy()}>
              {busy() ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              class="quiet small"
              onClick={() => {
                setEditing(false);
                props.onDone?.();
              }}
              disabled={busy()}
            >
              Cancel
            </button>
          </div>
        </form>
      </Show>
    </section>
  );
}
