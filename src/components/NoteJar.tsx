import { createMemo, createSignal, For, Show } from "solid-js";
import HeartIcon from "~/components/HeartIcon";
import { askReveal } from "~/components/PrivacyToggle";
import { formatEventDay } from "~/lib/format/date";
import { isVeiled } from "~/lib/privacy";
import type { FeedItem } from "~/lib/stores/points";

interface Props {
  feed: FeedItem[];
  userId: string;
  partnerName: string;
}

// Visual cap so the jar reads as "fuller over time", never as a count.
const MAX_SHOWN = 14;

// Fixed, hand-placed slots (x%, y%, rotation, scale) filling from the bottom.
const SLOTS: [number, number, number, number][] = [
  [30, 84, -12, 1], [52, 86, 8, 1.1], [72, 83, -4, 0.9],
  [40, 72, 14, 0.95], [62, 73, -10, 1.05], [24, 70, 6, 0.85],
  [50, 61, -6, 1], [74, 62, 12, 0.9], [33, 58, -14, 1],
  [60, 50, 4, 0.95], [42, 47, 10, 0.9], [26, 46, -8, 0.85],
  [70, 42, -12, 1], [50, 37, 6, 0.9],
];

// Memory jar: notes from your partner drop in as hearts; tap to pull a
// random one back out. Resurfaces appreciation; no numbers.
export default function NoteJar(props: Props) {
  const notes = createMemo(() =>
    props.feed.filter((f) => f.giver_id !== props.userId && !!f.comment),
  );
  const [picked, setPicked] = createSignal<FeedItem | null>(null);
  const [shake, setShake] = createSignal(0);

  const pull = () => {
    const list = notes();
    if (list.length === 0) return;
    const prev = picked();
    const pool = list.length > 1 && prev ? list.filter((n) => n.id !== prev.id) : list;
    setPicked(pool[Math.floor(Math.random() * pool.length)] ?? null);
    setShake((n) => n + 1);
  };

  const colors = ["give", "mine", "theirs"] as const;

  return (
    <section class="jar-wrap" aria-labelledby="jar-title">
      <h2 id="jar-title" class="visually-hidden">Memory jar</h2>
      <button
        type="button"
        class="jar"
        classList={{ "jar--empty": notes().length === 0, [`jar--shake${shake() % 2}`]: shake() > 0 }}
        disabled={notes().length === 0}
        onClick={pull}
        aria-label={
          notes().length === 0
            ? `Memory jar. Notes from ${props.partnerName} collect here`
            : `Memory jar. Tap to pull out a note from ${props.partnerName}`
        }
      >
        <svg class="jar-glass" viewBox="0 0 100 120" aria-hidden="true">
          <rect class="jar-lid" x="26" y="6" width="48" height="12" rx="4" />
          <path
            class="jar-body"
            d="M30 18h40v6c10 4 16 12 16 24v52c0 8-6 14-14 14H28c-8 0-14-6-14-14V48c0-12 6-20 16-24z"
          />
          <path class="jar-shine" d="M24 52c0-6 2-10 6-13" />
        </svg>
        <span class="jar-hearts" aria-hidden="true">
          <For each={notes().slice(0, MAX_SHOWN)}>
            {(_, i) => {
              // eslint-disable-next-line solid/reactivity -- slot fixed per heart
              const [x, y, r, s] = SLOTS[i()]!;
              return (
                <span
                  class={`jar-heart jar-heart--${colors[i() % 3]}`}
                  style={{
                    "inset-inline-start": `${x}%`,
                    "inset-block-start": `${y}%`,
                    "--r": `${r}deg`,
                    "--s": `${s}`,
                    "--d": `${i() * 60}ms`,
                  }}
                >
                  <HeartIcon filled />
                </span>
              );
            }}
          </For>
        </span>
      </button>
      <div class="jar-side">
        <Show
          when={picked()}
          keyed
          fallback={
            <p class="jar-caption">
              <Show
                when={notes().length > 0}
                fallback={<>Notes from {props.partnerName} land here.</>}
              >
                <strong>Tap the jar</strong> for a note from {props.partnerName}.
              </Show>
            </p>
          }
        >
          {(n) => (
            <figure class="jar-note">
              <Show
                when={!isVeiled(n.id)}
                fallback={
                  <button type="button" class="link-button" onClick={() => void askReveal(n.id)}>
                    Hidden — private mode. Show?
                  </button>
                }
              >
                <blockquote class="note-text">{n.comment}</blockquote>
              </Show>
              <figcaption class="jar-note-meta">
                {formatEventDay(n.event_date)}
                <button type="button" class="link-button" onClick={pull}>
                  Another
                </button>
              </figcaption>
            </figure>
          )}
        </Show>
      </div>
    </section>
  );
}
