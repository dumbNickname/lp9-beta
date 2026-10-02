import { For, Show } from "solid-js";
import { HeartRow } from "~/components/HeartIcon";
import { askReveal } from "~/components/PrivacyToggle";
import { formatEventDay } from "~/lib/format/date";
import { isVeiled } from "~/lib/privacy";
import type { FeedItem } from "~/lib/stores/points";

interface Props {
  date: string;
  items: FeedItem[];
  userId: string;
  partnerName: string;
  onClose: () => void;
}

// The notes of one day, opened from the garland or the season dots.
export default function DayPeek(props: Props) {
  return (
    <div class="day-peek" role="region" aria-label={`Notes from ${formatEventDay(props.date)}`}>
      <div class="day-peek-head">
        <span class="day-peek-day">{formatEventDay(props.date)}</span>
        <button type="button" class="link-button" onClick={() => props.onClose()}>
          Close
        </button>
      </div>
      <ul class="day-peek-list">
        <For each={props.items}>
          {(n) => (
            <li class="day-peek-item" classList={{ "day-peek-item--mine": n.giver_id === props.userId }}>
              <span class="day-peek-who">
                {n.giver_id === props.userId ? `You to ${props.partnerName}` : `${props.partnerName} to you`}
                <HeartRow amount={n.amount} />
              </span>
              <Show when={n.comment}>
                <Show
                  when={!isVeiled(n.id)}
                  fallback={
                    <button type="button" class="link-button" onClick={() => void askReveal(n.id)}>
                      Hidden — private mode. Show?
                    </button>
                  }
                >
                  <span class="day-peek-text">{n.comment}</span>
                </Show>
              </Show>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
}
