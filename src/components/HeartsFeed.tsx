import { For, Show } from "solid-js";
import HeartNote from "~/components/HeartNote";
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
}

export default function HeartsFeed(props: Props) {
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
            <p class="feed-empty">
              Nothing here yet. Notice one small thing today.
            </p>
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
