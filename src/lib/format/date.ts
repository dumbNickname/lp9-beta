const DAY_MS = 86_400_000;

// Local calendar date as YYYY-MM-DD (event_date is a plain date).
export function localDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number) as [number, number, number];
  return localDateString(new Date(y, m - 1, d + days));
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
  const [y, m, d] = eventDate.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
    new Date(y, m - 1, d),
  );
}

export const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
export const UNDO_WINDOW_MS = 5 * 60 * 1000;

export function withinWindow(createdAt: string, windowMs: number, now = Date.now()): boolean {
  return now - new Date(createdAt).getTime() < windowMs;
}
