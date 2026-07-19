import { supabase } from "~/lib/supabase";
import type { Archetype, Relationship, RelationshipWrap } from "./types";

const COLUMNS = "id, member_a, member_b, archetype, status, created_at, paired_at";
const WRAP_COLUMNS = "wrapped_key_blob, wrap_salt, wrap_iterations, wrap_algo";

// PostgREST serializes `bytea` as a hex string prefixed with `\x`
// (Postgres default `bytea_output = hex`). These helpers convert between
// that wire form and Uint8Array. On input to an RPC bytea parameter,
// PostgREST accepts the same `\x`-prefixed hex text.
function bytesToBytea(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return `\\x${hex}`;
}

function byteaToBytes(value: unknown): Uint8Array {
  // Expected form: hex string like "\\x0a1b...". Handle a few shapes
  // defensively in case PostgREST/driver config differs.
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return Uint8Array.from(value as number[]);
  if (typeof value !== "string") {
    throw new Error("unexpected bytea encoding");
  }
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}


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

// Convenience helper for the store: the first active relationship, if any.
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
