import { For, Show } from "solid-js";
import HeartNote from "~/components/HeartNote";
import { NotebookIcon } from "~/components/Icons";
import { isNewSince, sessionBaseline } from "~/lib/lastSeen";
import {
  editHeartComment,
  feed,
  pointsError,
  pointsLoading,
  refreshPoints,
  undoHearts,
} from "~/lib/stores/points";

interface Props {
  relationshipId: string;
  userId: string;
  partnerName: string;
  onRestoreKey: () => void;
  onOpenGuide?: () => void;
}

export default function HeartsFeed(props: Props) {
  // eslint-disable-next-line solid/reactivity -- captured once per mount
  const baseline = sessionBaseline(props.relationshipId);
  return (
    <section class="feed" aria-labelledby="feed-title">
      <div class="feed-head">
        <h2 id="feed-title" class="feed-title">Notes</h2>
        <button
          type="button"
          class="quiet small"
          onClick={() => void refreshPoints(props.relationshipId, props.userId)}
          disabled={pointsLoading()}
        >
          {pointsLoading() ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <Show when={pointsError()}>
        <p class="error" role="alert">Couldn't load notes. Try refreshing.</p>
      </Show>

      <Show
        when={feed().length > 0}
        fallback={
          <Show when={!pointsLoading()}>
            <div class="empty-state">
              <span class="empty-art" aria-hidden="true">
                <NotebookIcon />
              </span>
              <p class="feed-empty">Your notebook is empty.</p>
              <p class="empty-hint">Notice one small thing today.</p>
              <Show when={props.onOpenGuide}>
                <button type="button" class="quiet small empty-guide" onClick={() => props.onOpenGuide?.()}>
                  How it works
                </button>
              </Show>
            </div>
          </Show>
        }
      >
        <ol class="feed-list">
          <For each={feed()}>
            {(item) => (
              <HeartNote
                item={item}
                mine={item.giver_id === props.userId}
                partnerName={props.partnerName}
                isNew={item.giver_id !== props.userId && isNewSince(baseline, item.created_at)}
                onEdit={(text) =>
                  editHeartComment(props.relationshipId, props.userId, item.id, text)
                }
                onUndo={() => undoHearts(props.relationshipId, props.userId, item.id)}
                onRestoreKey={props.onRestoreKey}
              />
            )}
          </For>
        </ol>
      </Show>
    </section>
  );
}
