import { describe, expect, it } from "vitest";
import type { Point } from "~/lib/data/types";
import {
  dayLevel,
  hourCounts,
  lastDays,
  peakHour,
  reachedMilestone,
  seasonGrid,
  topWords,
  weekWarmth,
} from "~/lib/together";

const p = (event_date: string, amount = 1, created_at = `${event_date}T10:00:00`): Point =>
  ({ id: event_date + amount + created_at, event_date, amount, created_at }) as unknown as Point;

describe("together lib", () => {
  it("lastDays: oldest first, ending today, buckets by event date", () => {
    const days = lastDays([p("2026-10-02"), p("2026-10-02"), p("2026-09-30")], 3, "2026-10-02");
    expect(days.map((d) => [d.date, d.items.length])).toEqual([
      ["2026-09-30", 1],
      ["2026-10-01", 0],
      ["2026-10-02", 2],
    ]);
  });

  it("seasonGrid: weeks of Mon..Sun, future days null", () => {
    const g = seasonGrid([], 2, "2026-10-02");
    expect(g).toHaveLength(2);
    expect(g[0]![0]!.date).toBe("2026-09-21");
    expect(g[1]![3]!.date).toBe("2026-10-01");
    expect(g[1]![4]!.date).toBe("2026-10-02");
    expect(g[1]![5]).toBeNull();
  });

  it("dayLevel is absolute by hearts", () => {
    expect(dayLevel([])).toBe(0);
    expect(dayLevel([p("d", 2)])).toBe(1);
    expect(dayLevel([p("d", 3), p("d", 2)])).toBe(2);
    expect(dayLevel([p("d", 5), p("d", 1)])).toBe(3);
  });

  it("hour counts + peak", () => {
    const c = hourCounts([p("2026-10-01", 1, "2026-10-01T21:10:00"), p("2026-10-01", 1, "2026-10-02T21:40:00"), p("x", 1, "2026-10-02T08:00:00")]);
    expect(c[21]).toBe(2);
    expect(peakHour(c)).toBe(21);
    expect(peakHour(hourCounts([]))).toBeNull();
  });

  it("topWords drops stop words and short words", () => {
    const w = topWords(["You made me coffee", "the coffee was kind", "Kind of you, coffee!"]);
    expect(w[0]).toEqual({ word: "coffee", n: 3 });
    expect(w.map((x) => x.word)).toContain("kind");
    expect(w.map((x) => x.word)).not.toContain("you");
  });

  it("milestones and warmth", () => {
    expect(reachedMilestone(0)).toBeNull();
    expect(reachedMilestone(12)).toBe(10);
    expect(weekWarmth([], "2026-10-02")).toBe(0);
    expect(weekWarmth([p("2026-09-20", 5)], "2026-10-02")).toBe(0);
    expect(weekWarmth([p("2026-10-01", 5), p("2026-10-02", 5)], "2026-10-02")).toBe(2);
  });
});
