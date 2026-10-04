// Supabase returns RPC errors as plain `{ message }` objects, not Errors.
export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message ?? "");
  }
  return String(err ?? "");
}
