import { supabase } from "~/lib/supabase";
import type { Archetype, Relationship } from "./types";

const COLUMNS = "id, member_a, member_b, archetype, status, created_at, paired_at";

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
