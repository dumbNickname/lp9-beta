import { deleteKey, getKey, putKey } from "~/lib/crypto/keystore";

// The inviter's outstanding invite (code + key) lives in localStorage so a
// reload can restore the waiting screen; the AES key itself sits in
// IndexedDB under `invite:<code>` until the pair exists.
export const PENDING_INVITE_KEY = "pair_invite_pending";

export interface PendingInvite {
  code: string;
  keyBase64: string;
  // Pairs that already existed when the invite was made; never adopt onto
  // one of these. Missing on invites saved by older builds.
  knownIds?: string[];
}

export function tempKeyId(code: string): string {
  return `invite:${code}`;
}

export function readPendingInvite(): PendingInvite | null {
  try {
    const raw = localStorage.getItem(PENDING_INVITE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingInvite;
    if (parsed && typeof parsed.code === "string" && typeof parsed.keyBase64 === "string") {
      return parsed;
    }
  } catch {
    // storage unavailable or malformed
  }
  return null;
}

export function writePendingInvite(invite: PendingInvite): void {
  try {
    localStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(invite));
  } catch {
    // storage unavailable; reload-safety degrades but pairing still works
  }
}

export function clearPendingInvite(): void {
  try {
    localStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // storage unavailable
  }
}

// Move the invite's temp key onto the pair it created. Safe to call from
// anywhere that first notices the new pair (PairFlow poll, a focus refresh
// of the relationship store): the inviter's tab is often in the background
// while the partner joins, so the poll may never fire. Picks the newest
// pair this user created as inviter (member_a, see redeem_pair_code) that
// did not exist when the invite was made and has no key here yet.
// Returns the adopted pair id.
export async function adoptPendingInvite(
  rels: { id: string; member_a: string }[],
  userId: string,
): Promise<string | null> {
  const pending = readPendingInvite();
  if (!pending) return null;
  const temp = await getKey(tempKeyId(pending.code));
  if (!temp) return null;
  const known = new Set(pending.knownIds ?? []);
  for (const { id, member_a } of rels) {
    if (member_a !== userId || known.has(id)) continue;
    if (await getKey(id)) continue;
    await putKey(id, temp);
    await deleteKey(tempKeyId(pending.code));
    clearPendingInvite();
    return id;
  }
  return null;
}
