import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js";
import DayPeek from "~/components/DayPeek";
import { formatEventDay } from "~/lib/format/date";
import { privateMode } from "~/lib/privacy";
import type { FeedItem } from "~/lib/stores/points";
import { dayLevel, hourCounts, hueAt, hourLabel, peakHour, seasonGrid, topWords } from "~/lib/together";

interface Props {
  feed: FeedItem[];
  userId: string;
  partnerName: string;
}

type View = "season" | "clock" | "words";
const WEEKS = 12;

// One small card, three playful lenses on the shared notebook. Nothing is
// split per partner except "words", which only ever shows my own notes.
export default function Together(props: Props) {
  const [view, setView] = createSignal<View>("season");
  return (
    <section class="together" aria-labelledby="together-title">
      <div class="together-head">
        <h2 id="together-title" class="together-title">Our little almanac</h2>
        <div class="together-tabs" role="group" aria-label="View">
          <For each={[["season", "Season"], ["clock", "Clock"], ["words", "Words"]] as const}>
            {([v, label]) => (
              <button
                type="button"
                class="together-tab"
                aria-pressed={view() === v}
                onClick={() => setView(v)}
              >
                {label}
              </button>
            )}
          </For>
        </div>
      </div>
      <Switch>
        <Match when={view() === "season"}>
          <Season {...props} />
        </Match>
        <Match when={view() === "clock"}>
          <DayClock feed={props.feed} />
        </Match>
        <Match when={view() === "words"}>
          <Words {...props} />
        </Match>
      </Switch>
    </section>
  );
}

function Season(props: Props) {
  const grid = createMemo(() => seasonGrid(props.feed, WEEKS));
  const [open, setOpen] = createSignal<string | null>(null);
  const openDay = () =>
    grid()
      .flat()
      .find((d) => d?.date === open()) ?? null;
  return (
    <div class="season">
      <div class="season-grid" role="group" aria-label={`The last ${WEEKS} weeks`}>
        <For each={grid()}>
          {(week) => (
            <div class="season-week">
              <For each={week}>
                {(d) => (
                  <Show when={d} fallback={<span class="season-dot season-dot--future" />}>
                    {(day) => {
                      const level = () => dayLevel(day().items);
                      return (
                        <button
                          type="button"
                          class={`season-dot season-dot--l${level()}`}
                          classList={{ "is-open": open() === day().date }}
                          disabled={level() === 0}
                          aria-label={
                            level() === 0
                              ? formatEventDay(day().date)
                              : `${formatEventDay(day().date)}: ${day().items.length} ${day().items.length === 1 ? "note" : "notes"}`
                          }
                          onClick={() => setOpen((o) => (o === day().date ? null : day().date))}
                        />
                      );
                    }}
                  </Show>
                )}
              </For>
            </div>
          )}
        </For>
      </div>
      <p class="together-caption">Every dot is a day one of you noticed the other.</p>
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
    </div>
  );
}

function DayClock(props: { feed: FeedItem[] }) {
  const counts = createMemo(() => hourCounts(props.feed));
  const max = () => Math.max(1, ...counts());
  const peak = () => peakHour(counts());
  const petal = (h: number) => {
    const c = counts()[h] ?? 0;
    const len = c === 0 ? 0 : 14 + (c / max()) * 30;
    const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
    return { c, len, deg: (a * 180) / Math.PI };
  };
  return (
    <div class="dayclock">
      <svg class="dayclock-face" viewBox="-60 -60 120 120" role="img" aria-label={
        peak() === null ? "No notes yet" : `You two notice each other most around ${hourLabel(peak()!)}`
      }>
        <circle class="dayclock-rim" r="54" />
        <circle class="dayclock-night" r="54" />
        <For each={Array.from({ length: 24 }, (_, h) => h)}>
          {(h) => {
            const p = () => petal(h);
            return (
              <Show when={p().c > 0}>
                <g transform={`rotate(${p().deg})`}>
                  <ellipse
                    class="dayclock-petal"
                    classList={{ "is-peak": h === peak() }}
                    cx={10 + p().len / 2}
                    cy="0"
                    rx={p().len / 2}
                    ry={3 + Math.min(3, p().c)}
                    style={{ "--pd": `${h * 25}ms` }}
                  />
                </g>
              </Show>
            );
          }}
        </For>
        <For each={[0, 6, 12, 18]}>
          {(h) => {
            const a = (h / 24) * Math.PI * 2 - Math.PI / 2;
            return (
              <text class="dayclock-tick" x={Math.cos(a) * 47} y={Math.sin(a) * 47 + 2.5}>
                {h === 0 ? "0" : h}
              </text>
            );
          }}
        </For>
        <circle class="dayclock-core" r="8" />
      </svg>
      <p class="together-caption">
        <Show when={peak() !== null} fallback={<>Your notes will bloom here, hour by hour.</>}>
          You two notice each other most around <strong>{hourLabel(peak()!)}</strong>.
        </Show>
      </p>
    </div>
  );
}

function Words(props: Props) {
  const words = createMemo(() =>
    topWords(
      props.feed
        .filter((f) => f.giver_id === props.userId && !!f.comment)
        .map((f) => f.comment as string),
    ),
  );
  const max = () => Math.max(1, ...words().map((w) => w.n));
  return (
    <div class="words">
      <Show
        when={!privateMode()}
        fallback={<p class="together-caption">Hidden while private mode is on.</p>}
      >
        <Show
          when={words().length > 0}
          fallback={<p class="together-caption">The words you use most will gather here.</p>}
        >
          <ul class="words-cloud">
            <For each={words()}>
              {(w, i) => (
                <li
                  class={`words-word words-word--${hueAt(i())}`}
                  style={{ "--wsz": `${0.95 + (w.n / max()) * 1.1}rem`, "--wr": `${((i() * 37) % 9) - 4}deg` }}
                >
                  {w.word}
                </li>
              )}
            </For>
          </ul>
          <p class="together-caption">What you notice about {props.partnerName}, in your words.</p>
        </Show>
      </Show>
    </div>
  );
}
