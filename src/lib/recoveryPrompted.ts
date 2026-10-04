import { readLocal, writeLocal } from "~/lib/storage";

// One-time "set recovery password" prompt, tracked per relationship in
// localStorage so it shows once and survives reloads (D-22.3).
export const RECOVERY_PROMPTED_PREFIX = "recovery_prompted:";

export function wasRecoveryPrompted(relId: string): boolean {
  return readLocal(RECOVERY_PROMPTED_PREFIX + relId) !== null;
}

export function markRecoveryPrompted(relId: string): void {
  writeLocal(RECOVERY_PROMPTED_PREFIX + relId, "1");
}
