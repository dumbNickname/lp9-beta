import { addDays, localDateString } from "~/lib/format/date";
import type { Point } from "~/lib/data/types";

// Shared, non-comparing "us" visuals (Give world). All computed on this
// device from the already-decrypted feed; never split per partner.

export interface DayBucket<T extends Point = Point> {
  date: string;
  items: T[];
}

function byDay<T extends Point>(feed: T[]): Map<string, T[]> {
  const by = new Map<string, T[]>();
  for (const f of feed) {
    const list = by.get(f.event_date);
    if (list) list.push(f);
    else by.set(f.event_date, [f]);
  }
  return by;
}

// The last `days` calendar days, oldest first, ending today.
export function lastDays<T extends Point>(
  feed: T[],
  days: number,
  today: string = localDateString(),
): DayBucket<T>[] {
  const by = byDay(feed);
  const start = addDays(today, -(days - 1));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(start, i);
    return { date, items: by.get(date) ?? [] };
  });
}

function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return (new Date(y, m - 1, d).getDay() + 6) % 7;
}

// `weeks` columns of Monday..Sunday; days after today are null.
export function seasonGrid<T extends Point>(
  feed: T[],
  weeks: number,
  today: string = localDateString(),
): (DayBucket<T> | null)[][] {
  const by = byDay(feed);
  const monday = addDays(today, -weekday(today) - (weeks - 1) * 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(monday, w * 7 + d);
      return date > today ? null : { date, items: by.get(date) ?? [] };
    }),
  );
}

// 0 = empty paper, 1..3 = warmer dots. Absolute, so it never "ranks" days.
export function dayLevel(items: Point[]): 0 | 1 | 2 | 3 {
  const hearts = items.reduce((s, p) => s + p.amount, 0);
  if (hearts === 0) return 0;
  if (hearts <= 2) return 1;
  if (hearts <= 5) return 2;
  return 3;
}

// Notes per local hour of the day (0..23), from when they were written.
export function hourCounts(feed: Point[]): number[] {
  const out = Array.from({ length: 24 }, () => 0);
  for (const f of feed) {
    const h = new Date(f.created_at).getHours();
    if (Number.isFinite(h)) out[h] = (out[h] ?? 0) + 1;
  }
  return out;
}

export function peakHour(counts: number[]): number | null {
  let best = -1;
  let at: number | null = null;
  counts.forEach((c, h) => {
    if (c > best && c > 0) {
      best = c;
      at = h;
    }
  });
  return at;
}

export function hourLabel(h: number, locale = "en"): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric" }).format(new Date(2000, 0, 1, h));
}

const STOP = new Set(
  (
    "a an and are as at be been but by can did do for from had has have he her him his how i " +
    "if in into is it its just me my of on or our out she so that the their them then there " +
    "they this to too up us was we were what when which who why will with you your yours " +
    "it's i'm you're that's don't im youre thats dont really very much more also all about " +
    "after again am any because before being both each few got get go going made make over " +
    "same some such than these those through under until while would could should one"
  ).split(" "),
);

// Most-used words in my own notes. Local only, never the partner's.
export function topWords(texts: string[], max = 9): { word: string; n: number }[] {
  const counts = new Map<string, number>();
  for (const t of texts) {
    for (const raw of t.toLowerCase().match(/[\p{L}'’]+/gu) ?? []) {
      const w = raw.replace(/['’]+$/u, "").replace(/^['’]+/u, "");
      if (w.length < 3 || STOP.has(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([word, n]) => ({ word, n }))
    .sort((a, b) => b.n - a.n || a.word.localeCompare(b.word))
    .slice(0, max);
}

// Shared milestones, counted in notes written together (never per person).
export const MILESTONES = [1, 10, 25, 50] as const;

export function reachedMilestone(count: number): number | null {
  let hit: number | null = null;
  for (const m of MILESTONES) if (count >= m) hit = m;
  return hit;
}

// 0..3 from hearts in the last 7 days, for a soft background warmth.
export function weekWarmth(feed: Point[], today: string = localDateString()): 0 | 1 | 2 | 3 {
  const from = addDays(today, -6);
  const hearts = feed
    .filter((f) => f.event_date >= from && f.event_date <= today)
    .reduce((s, p) => s + p.amount, 0);
  if (hearts === 0) return 0;
  if (hearts < 6) return 1;
  if (hearts < 15) return 2;
  return 3;
}
