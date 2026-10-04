// Pure invite/pairing error mapping; kept apart from the RPC wrappers so
// components can use it while those are mocked.
import { errorMessage, friendlyFrom, type FriendlyTable } from "./errors";

const INVITE_ERRORS: FriendlyTable = [
  ["invalid code", "That invite code is not valid."],
  ["code already used", "That invite has already been used."],
  ["code expired", "That invite has expired."],
];

const PAIR_ERRORS: FriendlyTable = [
  ...INVITE_ERRORS,
  ["cannot pair with yourself", "You cannot pair with yourself."],
  ["relationship already exists", "You are already paired with this person."],
];

export const PEEK_FALLBACK = "Could not load this invite. Please try again.";

export function friendlyPeekError(err: unknown): string {
  return friendlyFrom(err, INVITE_ERRORS, PEEK_FALLBACK);
}

// Peek and redeem raise the same invite errors, plus pairing-specific ones.
export function friendlyPairError(err: unknown): string {
  return friendlyFrom(err, PAIR_ERRORS, "Could not pair. Please try again.");
}

export type InviteErrorCode = "used" | "expired" | "invalid" | "unknown";

// Carries a machine-readable code; the message stays the friendly text.
export class InviteError extends Error {
  readonly code: InviteErrorCode;
  constructor(code: InviteErrorCode, message: string) {
    super(message);
    this.name = "InviteError";
    this.code = code;
  }
}

export function inviteErrorCode(err: unknown): InviteErrorCode {
  const msg = errorMessage(err);
  if (msg.includes("code already used")) return "used";
  if (msg.includes("code expired")) return "expired";
  if (msg.includes("invalid code")) return "invalid";
  return "unknown";
}

export function isUsedInvite(err: unknown): boolean {
  return err instanceof Error && err.name === "InviteError" && (err as InviteError).code === "used";
}
