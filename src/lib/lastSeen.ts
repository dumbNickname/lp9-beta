import { readLocal, writeLocal } from "~/lib/storage";

// "New since your last visit" markers (PRD-46): per relationship, per
// device, localStorage only. The baseline is captured once per app load
// (so items stay marked "new" while you read), then the stored value is
// bumped to now.
export const LAST_SEEN_PREFIX = "last_seen:";
const baselines = new Map<string, string | null>();

export function sessionBaseline(relId: string): string | null {
  if (baselines.has(relId)) return baselines.get(relId)!;
  const prev = readLocal(LAST_SEEN_PREFIX + relId);
  writeLocal(LAST_SEEN_PREFIX + relId, new Date().toISOString());
  baselines.set(relId, prev);
  return prev;
}

// First visit (no baseline) marks nothing as new, to avoid a wall of badges.
export function isNewSince(baseline: string | null, createdAt: string): boolean {
  return baseline !== null && createdAt > baseline;
}

export function resetLastSeenForTests(): void {
  baselines.clear();
}
