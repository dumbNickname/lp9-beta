const DAY_MS = 86_400_000;

// Local calendar date as YYYY-MM-DD (event_date is a plain date).
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// YYYY-MM-DD as local midnight.
export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

export function addDays(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  return localDateString(d);
}

function daysBetween(fromStr: string, toStr: string): number {
  const [fy, fm, fd] = fromStr.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = toStr.split("-").map(Number) as [number, number, number];
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS);
}

// "today", "yesterday", "3 days ago", then a short date past a week.
export function formatEventDay(
  eventDate: string,
  today: string = localDateString(),
  locale = "en",
): string {
  const diff = daysBetween(eventDate, today);
  if (diff >= 0 && diff < 7) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-diff, "day");
  }
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
    parseLocalDate(eventDate),
  );
}

export type Urgency = "today" | "soon" | "later" | "undated";

// How soon an accepted claim happens: today/tomorrow, within a week, later.
export function urgencyOf(date: string | null, today: string = localDateString()): Urgency {
  if (!date) return "undated";
  if (date <= addDays(today, 1)) return "today";
  if (date <= addDays(today, 7)) return "soon";
  return "later";
}

const scheduleFmt = new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short" });

// Future-facing date label, e.g. "tomorrow" / "Sat, Oct 3".
export function scheduleLabel(date: string, today: string = localDateString()): string {
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  return scheduleFmt.format(parseLocalDate(date));
}

export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const UNDO_WINDOW_MS = 5 * 60 * 1000;

export function withinWindow(createdAt: string, windowMs: number, now = Date.now()): boolean {
  return now - new Date(createdAt).getTime() < windowMs;
}
