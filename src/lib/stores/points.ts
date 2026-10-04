import { createSignal } from "solid-js";
import { useFocusRefresh } from "~/lib/useFocusRefresh";
import { getKey } from "~/lib/crypto/keystore";
import { decryptComment, encryptComment } from "~/lib/crypto/comments";
import {
  deletePoint,
  editPointComment,
  givePoints,
  listPoints,
  listReceivedAmounts,
} from "~/lib/data/points";
import type { HeartAmount, Point } from "~/lib/data/types";
import { computeSpendable } from "~/lib/balance";
import { myClaims } from "~/lib/stores/claims";

export interface FeedItem extends Point {
  // Decrypted text; null when there is no comment or it is locked.
  comment: string | null;
  // True when a ciphertext exists but this device cannot decrypt it.
  locked: boolean;
}

const [feed, setFeed] = createSignal<FeedItem[]>([]);
const [receivedAmounts, setReceivedAmounts] = createSignal<number[]>([]);
const [pointsLoading, setPointsLoading] = createSignal(false);
const [pointsError, setPointsError] = createSignal(false);
// null = not checked yet (avoid flashing the "locked" state).
const [hasCommentKey, setHasCommentKey] = createSignal<boolean | null>(null);

let current: { relId: string; userId: string } | null = null;
let seq = 0;

async function toFeedItem(p: Point, key: CryptoKey | null): Promise<FeedItem> {
  if (!p.comment_ciphertext || !p.comment_iv) {
    return { ...p, comment: null, locked: false };
  }
  const text = await decryptComment(key, p.comment_ciphertext, p.comment_iv);
  return { ...p, comment: text, locked: text === null };
}

export async function refreshPoints(relId: string, userId: string): Promise<void> {
  current = { relId, userId };
  const my = ++seq;
  setPointsLoading(true);
  try {
    const key = await getKey(relId);
    if (my !== seq) return;
    setHasCommentKey(key !== null);
    const [rows, amounts] = await Promise.all([
      listPoints(relId),
      listReceivedAmounts(relId, userId),
    ]);
    const items = await Promise.all(rows.map((p) => toFeedItem(p, key)));
    if (my !== seq) return;
    setFeed(items);
    setReceivedAmounts(amounts);
    setPointsError(false);
  } catch {
    if (my === seq) setPointsError(true);
  } finally {
    if (my === seq) setPointsLoading(false);
  }
}

export async function giveHearts(
  relId: string,
  userId: string,
  amount: HeartAmount,
  text: string,
  eventDate: string,
): Promise<void> {
  const comment = await encryptComment(relId, text);
  await givePoints(relId, amount, comment, eventDate);
  await refreshPoints(relId, userId);
}

export async function editHeartComment(
  relId: string,
  userId: string,
  pointId: string,
  text: string,
): Promise<void> {
  const comment = await encryptComment(relId, text);
  await editPointComment(pointId, comment);
  await refreshPoints(relId, userId);
}

export async function undoHearts(relId: string, userId: string, pointId: string): Promise<void> {
  await deletePoint(pointId);
  setFeed((items) => items.filter((i) => i.id !== pointId));
  await refreshPoints(relId, userId);
}

// Received hearts minus my escrowed + spent claims (§13b). Mirrors the
// server's spendable_hearts(); the server remains the authority on claim.
export function mySpendable(userId: string): number {
  return computeSpendable(receivedAmounts(), myClaims(userId));
}

export function resetPoints(): void {
  current = null;
  seq++;
  setFeed([]);
  setReceivedAmounts([]);
  setHasCommentKey(null);
  setPointsError(false);
  setPointsLoading(false);
}

export function usePointsFocusRefresh(): void {
  useFocusRefresh(() => (current ? refreshPoints(current.relId, current.userId) : undefined));
}

export { feed, pointsLoading, pointsError, hasCommentKey };
