import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { HeartRow } from "~/components/HeartIcon";
import { COMMENT_MAX } from "~/lib/crypto/comments";
import { friendlyPointsError } from "~/lib/data/points";
import {
  EDIT_WINDOW_MS,
  UNDO_WINDOW_MS,
  formatEventDay,
  localDateString,
  withinWindow,
} from "~/lib/format/date";
import { privateMode } from "~/lib/privacy";
import type { FeedItem } from "~/lib/stores/points";

interface Props {
  item: FeedItem;
  mine: boolean;
  partnerName: string;
  onEdit: (text: string) => Promise<void>;
  onUndo: () => Promise<void>;
  onRestoreKey: () => void;
  isNew?: boolean;
}

export default function HeartNote(props: Props) {
  // Tick so the undo/edit affordances disappear when their windows close.
  const [now, setNow] = createSignal(Date.now());
  onMount(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    onCleanup(() => clearInterval(t));
  });

  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  const canUndo = () => props.mine && withinWindow(props.item.created_at, UNDO_WINDOW_MS, now());
  const canEdit = () =>
    props.mine && !props.item.locked && withinWindow(props.item.created_at, EDIT_WINDOW_MS, now());
  const createdDay = () => localDateString(new Date(props.item.created_at));
  const backdated = () => props.item.event_date < createdDay();

  const run = async (action: "edit" | "undo") => {
    setBusy(true);
    setError("");
    try {
      if (action === "edit") await props.onEdit(draft());
      else await props.onUndo();
      setEditing(false);
    } catch (err) {
      setError(friendlyPointsError(err));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = (e: Event) => {
    e.preventDefault();
    void run("edit");
  };
  const undo = () => {
    void run("undo");
  };

  return (
    <li
      class="note"
      classList={{ "note--mine": props.mine, "note--theirs": !props.mine, "note--new": !!props.isNew }}
    >
      <div class="note-meta">
        <span class="note-who">
          {props.mine ? `You to ${props.partnerName}` : `From ${props.partnerName}`}
          <Show when={props.isNew}>
            <span class="new-dot">new</span>
          </Show>
        </span>
        <HeartRow amount={props.item.amount} />
      </div>

      <Show
        when={!editing()}
        fallback={
          <form
            class="note-edit"
            onSubmit={saveEdit}
          >
            <label>
              <span class="visually-hidden">Edit comment</span>
              <textarea
                rows={2}
                maxLength={COMMENT_MAX}
                value={draft()}
                onInput={(e) => setDraft(e.currentTarget.value)}
                disabled={busy()}
              />
            </label>
            <div class="note-actions">
              <button type="submit" disabled={busy()}>Save</button>
              <button type="button" class="quiet" onClick={() => setEditing(false)} disabled={busy()}>
                Cancel
              </button>
            </div>
          </form>
        }
      >
        <Show when={props.item.comment_ciphertext}>
          <Show
            when={!privateMode()}
            fallback={<p class="note-placeholder">Comment hidden — private mode</p>}
          >
            <Show
              when={!props.item.locked}
              fallback={
                <p class="note-placeholder">
                  Comment locked on this device.{" "}
                  <button type="button" class="link-button" onClick={() => props.onRestoreKey()}>
                    Unlock
                  </button>
                </p>
              }
            >
              <blockquote class="note-text">{props.item.comment}</blockquote>
            </Show>
          </Show>
        </Show>
      </Show>

      <div class="note-foot">
        <span class="note-date">
          {formatEventDay(props.item.event_date)}
          <Show when={props.item.edited_at}>
            <span class="note-badge">edited</span>
          </Show>
          <Show when={backdated()}>
            <span class="note-badge">noted {formatEventDay(createdDay())}</span>
          </Show>
        </span>
        <Show when={!editing() && (canEdit() || canUndo())}>
          <span class="note-actions">
            <Show when={canEdit() && !privateMode()}>
              <button
                type="button"
                class="link-button"
                onClick={() => {
                  setDraft(props.item.comment ?? "");
                  setEditing(true);
                }}
              >
                Edit
              </button>
            </Show>
            <Show when={canUndo()}>
              <button
                type="button"
                class="link-button"
                disabled={busy()}
                onClick={undo}
              >
                Undo
              </button>
            </Show>
          </span>
        </Show>
      </div>
      <Show when={error()}>
        <p class="error" role="alert">{error()}</p>
      </Show>
    </li>
  );
}
