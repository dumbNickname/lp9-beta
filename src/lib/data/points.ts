import { supabase } from "~/lib/supabase";
import { byteaToBytes, bytesToBytea } from "./bytea";
import type { EncryptedComment, HeartAmount, Point } from "./types";

const COLUMNS =
  "id, relationship_id, giver_id, receiver_id, amount, comment_ciphertext, comment_iv, edited_at, event_date, created_at";

type PointRow = Omit<Point, "comment_ciphertext" | "comment_iv"> & {
  comment_ciphertext: unknown;
  comment_iv: unknown;
};

function decodeRow(row: PointRow): Point {
  return {
    ...row,
    comment_ciphertext:
      row.comment_ciphertext == null ? null : byteaToBytes(row.comment_ciphertext),
    comment_iv: row.comment_iv == null ? null : byteaToBytes(row.comment_iv),
  };
}

function commentArgs(comment: EncryptedComment | null) {
  return {
    p_ciphertext: comment ? bytesToBytea(comment.ciphertext) : null,
    p_iv: comment ? bytesToBytea(comment.iv) : null,
  };
}

// Newest first. RLS hides soft-deleted rows and non-member relationships;
// the explicit relationship filter is required by PostgREST (AGENTS.md).
export async function listPoints(relId: string, limit = 50): Promise<Point[]> {
  const { data, error } = await supabase
    .from("points")
    .select(COLUMNS)
    .eq("relationship_id", relId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as PointRow[]).map(decodeRow);
}

// Every heart amount the user received in the relationship. Separate from
// the paginated feed so the balance counts everything (D-30.1).
export async function listReceivedAmounts(
  relId: string,
  userId: string,
): Promise<number[]> {
  const { data, error } = await supabase
    .from("points")
    .select("amount")
    .eq("relationship_id", relId)
    .eq("receiver_id", userId);
  if (error) throw error;
  return ((data ?? []) as { amount: number }[]).map((r) => r.amount);
}

export async function givePoints(
  relId: string,
  amount: HeartAmount,
  comment: EncryptedComment | null,
  eventDate: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("give_points", {
    p_rel_id: relId,
    p_amount: amount,
    ...commentArgs(comment),
    p_event_date: eventDate,
  });
  if (error) throw error;
  return data as string;
}

export async function editPointComment(
  pointId: string,
  comment: EncryptedComment | null,
): Promise<void> {
  const { error } = await supabase.rpc("edit_point_comment", {
    p_point_id: pointId,
    ...commentArgs(comment),
  });
  if (error) throw error;
}

export async function deletePoint(pointId: string): Promise<void> {
  const { error } = await supabase.rpc("delete_point", { p_point_id: pointId });
  if (error) throw error;
}

const FRIENDLY: [string, string][] = [
  ["edit window closed", "This note can no longer be edited (24 hours have passed)."],
  ["delete window closed", "It's too late to undo this one."],
  ["invalid event date", "Pick a date within the last 30 days."],
  ["invalid amount", "Choose between 1 and 5 hearts."],
  ["invalid comment", "That comment couldn't be sent. Try a shorter one."],
  ["relationship not active", "This relationship is no longer active."],
  ["not the giver", "Only the sender can change this note."],
];

export function friendlyPointsError(err: unknown): string {
  const msg =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : String(err ?? "");
  for (const [needle, text] of FRIENDLY) {
    if (msg.includes(needle)) return text;
  }
  return "Something went wrong. Please try again.";
}
