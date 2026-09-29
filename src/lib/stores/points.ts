import { createSignal, onCleanup, onMount } from "solid-js";
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

async function toFeedItem(p: Point, key: CryptoKey | null): Promise<FeedItem> {
  if (!p.comment_ciphertext || !p.comment_iv) {
    return { ...p, comment: null, locked: false };
  }
  const text = await decryptComment(key, p.comment_ciphertext, p.comment_iv);
  return { ...p, comment: text, locked: text === null };
}

export async function refreshPoints(relId: string, userId: string): Promise<void> {
  current = { relId, userId };
  setPointsLoading(true);
  try {
    const key = await getKey(relId);
    setHasCommentKey(key !== null);
    const [rows, amounts] = await Promise.all([
      listPoints(relId),
      listReceivedAmounts(relId, userId),
    ]);
    setFeed(await Promise.all(rows.map((p) => toFeedItem(p, key))));
    setReceivedAmounts(amounts);
    setPointsError(false);
  } catch {
    setPointsError(true);
  } finally {
    setPointsLoading(false);
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
  setFeed([]);
  setReceivedAmounts([]);
  setHasCommentKey(null);
}

export function usePointsFocusRefresh(): void {
  onMount(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible" && current) {
        void refreshPoints(current.relId, current.userId);
      }
    };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    onCleanup(() => {
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    });
  });
}

export { feed, pointsLoading, pointsError, hasCommentKey };
