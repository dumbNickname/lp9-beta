import { createSignal, Show } from "solid-js";
import HeartIcon from "~/components/HeartIcon";
import { saveProfile } from "~/lib/stores/profile";

export const NAME_MAX = 50;

export function initial(name: string): string {
  const ch = Array.from(name.trim())[0];
  return ch ? ch.toLocaleUpperCase() : "?";
}

interface Props {
  myName: string;
  partnerName: string | null;
}

// "Who am I paired with" at a glance + edit own display name (PRD-34).
export default function PairBadge(props: Props) {
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

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
              Paired.{" "}
              <button type="button" class="link-button" onClick={start}>
                Edit my name
              </button>
            </p>
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
              onClick={() => setEditing(false)}
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
