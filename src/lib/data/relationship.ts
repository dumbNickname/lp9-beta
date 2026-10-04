import { supabase } from "~/lib/supabase";
import { byteaToBytes, bytesToBytea } from "./bytea";
import { InviteError, inviteErrorCode, friendlyPeekError, PEEK_FALLBACK } from "./pairErrors";
import type {
  Archetype,
  PairInvitePeek,
  Relationship,
  RelationshipWrap,
} from "./types";

export {
  friendlyPairError,
  friendlyPeekError,
  InviteError,
  isUsedInvite,
  type InviteErrorCode,
} from "./pairErrors";

const COLUMNS = "id, member_a, member_b, archetype, status, created_at, paired_at";
const WRAP_COLUMNS = "wrapped_key_blob, wrap_salt, wrap_iterations, wrap_algo";

// SELECT the caller's relationships. RLS restricts rows to those the
// caller is a member of, but PostgREST returns 400 on a bare filterless
// select (see AGENTS.md), so we add an explicit member filter.
export async function getMyRelationships(): Promise<Relationship[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("relationships")
    .select(COLUMNS)
    .or(`member_a.eq.${user.id},member_b.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Relationship[];
}

// Newest active relationship, if any (list is ordered created_at desc).
// Used by PairFlow's inviter poll to spot a freshly-created pair.
export async function getMyActiveRelationship(): Promise<Relationship | null> {
  const rels = await getMyRelationships();
  return rels.find((r) => r.status === "active") ?? null;
}

// Inviter: create a pairing invite, returns the opaque code.
export async function createPairInvite(archetype: Archetype): Promise<string> {
  const { data, error } = await supabase.rpc("create_pair_invite", {
    p_archetype: archetype,
  });
  if (error) throw error;
  return data as string;
}

// Redeemer: consume a code, returns the new relationship id.
export async function redeemPairCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc("redeem_pair_code", {
    p_code: code,
  });
  if (error) throw error;
  return data as string;
}

// Redeemer: read-only preview of an invite for the confirm view (PRD-25).
// Does NOT consume the invite. `peek_pair_code` is `returns table(...)`,
// surfaced as an array, so we take the first row. Throws an InviteError.
export async function peekPairCode(code: string): Promise<PairInvitePeek> {
  const { data, error } = await supabase.rpc("peek_pair_code", {
    p_code: code,
  });
  if (error) throw new InviteError(inviteErrorCode(error), friendlyPeekError(error));
  const row = (data as PairInvitePeek[] | null)?.[0];
  if (!row) throw new InviteError("unknown", PEEK_FALLBACK);
  return {
    display_name: row.display_name ?? null,
    archetype: row.archetype,
  };
}

// Inviter: revoke an unconsumed invite.
export async function revokePairInvite(code: string): Promise<void> {
  const { error } = await supabase.rpc("revoke_pair_invite", {
    p_code: code,
  });
  if (error) throw error;
}

// Fetch the password-wrapped key columns for a relationship. RLS restricts
// rows to members, but PostgREST returns 400 on a bare filterless select
// (see AGENTS.md), so we add an explicit id filter. Returns null when no
// recovery password has been set yet.
export async function getRelationshipWrap(
  relId: string,
): Promise<RelationshipWrap | null> {
  const { data, error } = await supabase
    .from("relationships")
    .select(WRAP_COLUMNS)
    .eq("id", relId)
    .maybeSingle();

  if (error) throw error;
  if (
    !data ||
    data.wrapped_key_blob == null ||
    data.wrap_salt == null ||
    data.wrap_iterations == null ||
    data.wrap_algo == null
  ) {
    return null;
  }

  return {
    wrapped_key_blob: byteaToBytes(data.wrapped_key_blob),
    wrap_salt: byteaToBytes(data.wrap_salt),
    wrap_iterations: data.wrap_iterations as number,
    wrap_algo: data.wrap_algo as string,
  };
}

// Write (first-set or change) the password-wrapped key blob + PBKDF2 params
// via the RPC. Bytea args go over the wire as `\x`-prefixed hex text.
export async function setRecoveryPassword(
  relId: string,
  wrappedBlob: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  algo: string,
): Promise<void> {
  const { error } = await supabase.rpc("set_recovery_password", {
    p_rel_id: relId,
    p_wrapped_blob: bytesToBytea(wrappedBlob),
    p_salt: bytesToBytea(salt),
    p_iterations: iterations,
    p_algo: algo,
  });
  if (error) throw error;
}
