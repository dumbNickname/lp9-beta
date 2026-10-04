// Supabase returns RPC errors as plain `{ message }` objects, not Errors.
export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message ?? "");
  }
  return String(err ?? "");
}

export type FriendlyTable = readonly (readonly [needle: string, text: string])[];

export function friendlyFrom(err: unknown, table: FriendlyTable, fallback: string): string {
  const msg = errorMessage(err);
  for (const [needle, text] of table) {
    if (msg.includes(needle)) return text;
  }
  return fallback;
}
