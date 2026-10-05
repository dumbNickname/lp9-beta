import type { Claim } from "~/lib/data/types";

const DAY_MS = 86_400_000;

// Mirrors nudge_claim on the server, which enforces both.
export const NUDGE_MIN_AGE_MS = 7 * DAY_MS;
export const NUDGE_COOLDOWN_MS = DAY_MS;

export function claimStatusText(c: Claim, mine: boolean, partner: string): string {
  switch (c.status) {
    case "pending":
      return mine ? `Waiting for ${partner}` : "Waiting for you";
    case "accepted":
      return mine ? `${partner} said yes` : "You said yes";
    case "delivered":
      return "Done";
    case "declined":
      return mine ? `${partner} can't right now — hearts returned` : "You passed — hearts returned";
    case "withdrawn":
      return "Withdrawn — hearts returned";
    case "cancelled":
      return "Cancelled — hearts returned";
    case "auto_refunded":
      return "No answer in 14 days — hearts returned";
  }
}

export function canNudge(c: Claim, userId: string, now = Date.now()): boolean {
  if (c.claimer_id !== userId || c.status !== "pending") return false;
  const age = now - new Date(c.claimed_at).getTime();
  const sinceNudge = c.nudged_at ? now - new Date(c.nudged_at).getTime() : Infinity;
  return age >= NUDGE_MIN_AGE_MS && sinceNudge >= NUDGE_COOLDOWN_MS;
}
