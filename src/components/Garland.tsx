import { createMemo, createSignal, For, Show } from "solid-js";
import DayPeek from "~/components/DayPeek";
import { formatEventDay } from "~/lib/format/date";
import type { FeedItem } from "~/lib/stores/points";
import { dayLevel, hueAt, lastDays, reachedMilestone } from "~/lib/together";

interface Props {
  feed: FeedItem[];
  userId: string;
  partnerName: string;
}

const DAYS = 14;
const W = 320;
const H = 64;
const SAG = 18;

// y of the hanging string at x (a soft parabola between two pins).
function stringY(x: number): number {
  const t = x / W;
  return 10 + SAG * 4 * t * (1 - t);
}

// "Us" garland: the last two weeks as bulbs on a string. A bulb glows on
// days either of you noticed something; both partners share one palette,
// so it never reads as who-gave-more. Tap a lit bulb to read that day.
export default function Garland(props: Props) {
  const days = createMemo(() => lastDays(props.feed, DAYS));
  const [open, setOpen] = createSignal<string | null>(null);
  const openDay = () => days().find((d) => d.date === open()) ?? null;
  const lit = () => days().filter((d) => d.items.length > 0).length;
  const milestone = () => reachedMilestone(props.feed.length);

  return (
    <section class="garland" aria-labelledby="garland-title">
      <div class="garland-head">
        <h2 id="garland-title" class="garland-title">Us, lately</h2>
        <Show when={milestone()}>
          {(m) => (
            <span class="garland-ribbon">
              {m() === 1 ? "First note together" : `${m()}+ notes together`}
            </span>
          )}
        </Show>
      </div>
      <div class="garland-stage">
        <svg class="garland-string" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={`M0 10 Q ${W / 2} ${10 + SAG * 2} ${W} 10`} />
        </svg>
        <ol class="garland-bulbs">
          <For each={days()}>
            {(d, i) => {
              const x = () => ((i() + 0.5) / DAYS) * W;
              const level = () => dayLevel(d.items);
              return (
                <li
                  class="garland-slot"
                  style={{
                    "inset-inline-start": `${((i() + 0.5) / DAYS) * 100}%`,
                    "inset-block-start": `${(stringY(x()) / H) * 100}%`,
                    "--sway": `${(i() % 3) - 1}`,
                    "--gd": `${i() * 70}ms`,
                  }}
                >
                  <button
                    type="button"
                    class={`garland-bulb garland-bulb--l${level()} garland-bulb--${hueAt(i())}`}
                    classList={{ "is-open": open() === d.date, "is-today": i() === DAYS - 1 }}
                    disabled={level() === 0}
                    aria-pressed={open() === d.date}
                    aria-label={
                      level() === 0
                        ? `${formatEventDay(d.date)}: quiet day`
                        : `${formatEventDay(d.date)}: ${d.items.length} ${d.items.length === 1 ? "note" : "notes"}. Tap to read`
                    }
                    onClick={() => setOpen((o) => (o === d.date ? null : d.date))}
                  >
                    <span class="garland-cap" aria-hidden="true" />
                    <span class="garland-glass" aria-hidden="true" />
                  </button>
                </li>
              );
            }}
          </For>
        </ol>
      </div>
      <p class="garland-caption">
        <Show
          when={lit() > 0}
          fallback={<>Each day either of you notices something, a light comes on.</>}
        >
          {lit() === 1 ? "One bright day" : `${lit()} bright days`} in the last two weeks.
        </Show>
      </p>
      <Show when={openDay()} keyed>
        {(d) => (
          <DayPeek
            date={d.date}
            items={d.items}
            userId={props.userId}
            partnerName={props.partnerName}
            onClose={() => setOpen(null)}
          />
        )}
      </Show>
    </section>
  );
}
