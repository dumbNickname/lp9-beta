import { For, Show } from "solid-js";
import type { Claim, Coupon } from "~/lib/data/types";
import { addDays, localDateString } from "~/lib/format/date";

interface Props {
  claims: Claim[];
  coupons: Map<string, Coupon>;
  userId: string;
  partnerName: string;
  days?: number;
}

// Two-week "Coming up" strip (owner 2026-09-29): accepted claims placed on
// their scheduled day; undated accepted claims listed as "some day soon".
export default function ComingUp(props: Props) {
  const days = () => {
    const today = localDateString();
    return Array.from({ length: props.days ?? 14 }, (_, i) => addDays(today, i));
  };
  const accepted = () => props.claims.filter((c) => c.status === "accepted");
  const on = (day: string) => accepted().filter((c) => c.scheduled_date === day);
  const undated = () =>
    accepted().filter((c) => !c.scheduled_date || c.scheduled_date < localDateString());
  const later = () => accepted().filter((c) => c.scheduled_date && c.scheduled_date > days().at(-1)!);

  const undatedLabel = (c: Claim) => {
    if (!c.scheduled_date) return "Some day soon";
    return c.scheduled_date < localDateString() ? "Date passed" : "Later";
  };

  const who = (c: Claim) => (c.claimer_id === props.userId ? "for you" : `for ${props.partnerName}`);
  const title = (c: Claim) => props.coupons.get(c.coupon_id)?.title ?? "a coupon";
  const emoji = (c: Claim) => props.coupons.get(c.coupon_id)?.emoji || "♡";

  const weekday = (d: string) => {
    const [y, m, dd] = d.split("-").map(Number) as [number, number, number];
    return new Intl.DateTimeFormat("en", { weekday: "narrow" }).format(new Date(y, m - 1, dd));
  };
  const dayNum = (d: string) => Number(d.slice(8));

  return (
    <section class="card coming-up" aria-labelledby="coming-title">
      <div class="coming-head">
        <h3 id="coming-title" class="templates-title">Coming up</h3>
        <span class="cal-legend">
          <span class="cal-legend-item cal-legend-item--mine">for you</span>
          <span class="cal-legend-item cal-legend-item--theirs">for {props.partnerName}</span>
        </span>
      </div>
      <ol class="cal-strip" aria-label="Next two weeks">
        <For each={days()}>
          {(d, i) => (
            <li
              class="cal-day"
              classList={{
                "is-today": i() === 0,
                "has-plan": on(d).length > 0,
                "plan-mine": on(d).some((c) => c.claimer_id === props.userId),
                "plan-theirs": on(d).some((c) => c.claimer_id !== props.userId),
              }}
              aria-label={`${d}${on(d).length ? `: ${on(d).map(title).join(", ")}` : ""}`}
            >
              <span class="cal-wd" aria-hidden="true">{weekday(d)}</span>
              <span class="cal-num" aria-hidden="true">{dayNum(d)}</span>
              <span class="cal-dots" aria-hidden="true">
                <For each={on(d)}>
                  {(c) => (
                    <span
                      class="cal-dot"
                      classList={{ "cal-dot--mine": c.claimer_id === props.userId }}
                    />
                  )}
                </For>
              </span>
            </li>
          )}
        </For>
      </ol>

      <Show
        when={accepted().length > 0}
        fallback={<p class="feed-empty-small">Nothing planned yet. Accepted coupons with a date show up here.</p>}
      >
        <ul class="plan-list">
          <For each={days().filter((d) => on(d).length > 0)}>
            {(d) => (
              <For each={on(d)}>
                {(c) => (
                  <li class="plan" classList={{ "plan--mine": c.claimer_id === props.userId }}>
                    <span class="plan-date">
                      {new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short" }).format(
                        new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, dayNum(d)),
                      )}
                    </span>
                    <span aria-hidden="true">{emoji(c)}</span>
                    <span class="plan-title">{title(c)}</span>
                    <span class="plan-who">{who(c)}</span>
                  </li>
                )}
              </For>
            )}
          </For>
          <For each={[...undated(), ...later()]}>
            {(c) => (
              <li class="plan plan--undated" classList={{ "plan--mine": c.claimer_id === props.userId }}>
                <span class="plan-date">{undatedLabel(c)}</span>
                <span aria-hidden="true">{emoji(c)}</span>
                <span class="plan-title">{title(c)}</span>
                <span class="plan-who">{who(c)}</span>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
}
