// Pure invite/pairing error mapping; kept apart from the RPC wrappers so
// components can use it while those are mocked.
import { errorMessage, friendlyFrom, type FriendlyTable } from "./errors";

export type InviteErrorCode = "used" | "expired" | "invalid" | "unknown";

const INVITE_CODES: readonly (readonly [needle: string, text: string, code: InviteErrorCode])[] = [
  ["invalid code", "That invite code is not valid.", "invalid"],
  ["code already used", "That invite has already been used.", "used"],
  ["code expired", "That invite has expired.", "expired"],
];

const INVITE_ERRORS: FriendlyTable = INVITE_CODES.map(([needle, text]) => [needle, text] as const);

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
  return INVITE_CODES.find(([needle]) => msg.includes(needle))?.[2] ?? "unknown";
}

export function isUsedInvite(err: unknown): boolean {
  return err instanceof Error && err.name === "InviteError" && (err as InviteError).code === "used";
}
