import { describe, expect, it } from "vitest";
import { canNudge, NUDGE_COOLDOWN_MS, NUDGE_MIN_AGE_MS } from "~/lib/claims";
import type { Claim } from "~/lib/data/types";
import { addDays, parseLocalDate, scheduleLabel, urgencyOf } from "~/lib/format/date";
import { otherMember } from "~/lib/relationship";
import { hueAt } from "~/lib/together";

const NOW = Date.UTC(2026, 9, 4, 12);
const claim = (o: Partial<Claim>): Claim =>
  ({ claimer_id: "me", status: "pending", claimed_at: new Date(NOW - NUDGE_MIN_AGE_MS).toISOString(), nudged_at: null, ...o }) as Claim;

describe("pure helpers", () => {
  it("otherMember picks the other side", () => {
    expect(otherMember({ member_a: "a", member_b: "b" }, "a")).toBe("b");
    expect(otherMember({ member_a: "a", member_b: "b" }, "b")).toBe("a");
  });

  it("canNudge follows age and cooldown", () => {
    expect(canNudge(claim({}), "me", NOW)).toBe(true);
    expect(canNudge(claim({}), "bob", NOW)).toBe(false);
    expect(canNudge(claim({ status: "accepted" }), "me", NOW)).toBe(false);
    expect(canNudge(claim({ claimed_at: new Date(NOW - NUDGE_MIN_AGE_MS + 1).toISOString() }), "me", NOW)).toBe(false);
    expect(canNudge(claim({ nudged_at: new Date(NOW - NUDGE_COOLDOWN_MS + 1).toISOString() }), "me", NOW)).toBe(false);
    expect(canNudge(claim({ nudged_at: new Date(NOW - NUDGE_COOLDOWN_MS).toISOString() }), "me", NOW)).toBe(true);
  });

  it("parseLocalDate gives local midnight", () => {
    const d = parseLocalDate("2026-03-29");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 2, 29, 0]);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("scheduleLabel and urgencyOf take an injected today", () => {
    const t = "2026-10-04";
    expect(scheduleLabel(t, t)).toBe("today");
    expect(scheduleLabel("2026-10-05", t)).toBe("tomorrow");
    expect(urgencyOf(null, t)).toBe("undated");
    expect(urgencyOf("2026-10-05", t)).toBe("today");
    expect(urgencyOf("2026-10-11", t)).toBe("soon");
    expect(urgencyOf("2026-10-12", t)).toBe("later");
  });

  it("hueAt cycles the world colours", () => {
    expect([0, 1, 2, 3].map(hueAt)).toEqual(["give", "mine", "theirs", "give"]);
  });
});
