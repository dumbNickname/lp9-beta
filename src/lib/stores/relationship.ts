import { createSignal } from "solid-js";
import { useFocusRefresh } from "~/lib/useFocusRefresh";
import { getMyRelationships } from "~/lib/data/relationship";
import { adoptPendingInvite, readPendingInvite } from "~/lib/pairing/pendingInvite";
import { user } from "~/lib/session";
import type { Relationship } from "~/lib/data/types";

// All active relationships + the selected one (PRD-43, DESIGN §4).
// Selection priority: `?rel=<id>` (if mine) > remembered on this device >
// newest.
export const ACTIVE_REL_KEY = "active_relationship";

const [relationships, setRelationships] = createSignal<Relationship[]>([]);
const [selectedId, setSelectedId] = createSignal<string | null>(null);
const [relationshipLoading, setRelationshipLoading] = createSignal(false);
// True while an already-paired user is pairing with someone new.
const [addingPartner, setAddingPartner] = createSignal(false);

let lastFetchTime = 0;
let loadedOnce = false;
const THROTTLE_MS = 2000;
let seq = 0;
// Set when a pair was just made on this device; the shell shows the
// "paired" moment until dismissed.
const [justPaired, setJustPaired] = createSignal<string | null>(null);

function readUrlRel(): string | null {
  try {
    return new URLSearchParams(window.location.search).get("rel");
  } catch {
    return null;
  }
}

function readRemembered(): string | null {
  try {
    return localStorage.getItem(ACTIVE_REL_KEY);
  } catch {
    return null;
  }
}

function remember(id: string): void {
  try {
    localStorage.setItem(ACTIVE_REL_KEY, id);
  } catch {
    // storage unavailable
  }
}

// Reflect the selection in `?rel=` with an absolute URL (see the
// `<base href>` gotcha in src/AGENTS.md). Only when >1 relationship, so
// single-pair users keep a clean URL.
function writeUrlRel(id: string | null): void {
  try {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("rel", id);
    else url.searchParams.delete("rel");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  } catch {
    // history unavailable
  }
}

export function pickRelationship(
  rels: Relationship[],
  urlId: string | null,
  rememberedId: string | null,
): Relationship | null {
  const has = (id: string | null) => (id ? rels.find((r) => r.id === id) : undefined);
  return has(urlId) ?? has(rememberedId) ?? rels[0] ?? null;
}

export const relationship = (): Relationship | null =>
  relationships().find((r) => r.id === selectedId()) ?? null;

export async function refreshRelationship(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastFetchTime < THROTTLE_MS) return;
  lastFetchTime = now;

  // First load only (see stores/profile.ts).
  const my = ++seq;
  if (!loadedOnce) setRelationshipLoading(true);
  try {
    const rels = (await getMyRelationships()).filter((r) => r.status === "active");
    if (my !== seq) return;
    // Inviter whose tab was in the background while the partner joined:
    // PairFlow's poll never fired, so give the new pair its key here,
    // before anything renders it as "locked".
    let adopted: string | null = null;
    const me = user()?.id;
    if (me && readPendingInvite()) adopted = await adoptPendingInvite(rels, me);
    if (my !== seq) {
      if (adopted) {
        setSelectedId(adopted);
        remember(adopted);
        setAddingPartner(false);
        setJustPaired(adopted);
      }
      return;
    }
    setRelationships(rels);
    const current = selectedId();
    const keep =
      adopted ?? (current && rels.some((r) => r.id === current) ? current : null);
    const picked = keep
      ? rels.find((r) => r.id === keep)!
      : pickRelationship(rels, readUrlRel(), readRemembered());
    setSelectedId(picked?.id ?? null);
    if (picked) remember(picked.id);
    if (rels.length > 1 && picked) writeUrlRel(picked.id);
    if (adopted) {
      setAddingPartner(false);
      setJustPaired(adopted);
    }
    loadedOnce = true;
  } finally {
    if (my === seq) setRelationshipLoading(false);
  }
}

export function selectRelationship(id: string): void {
  if (!relationships().some((r) => r.id === id)) return;
  setSelectedId(id);
  setAddingPartner(false);
  remember(id);
  writeUrlRel(relationships().length > 1 ? id : null);
}

// Called by PairFlow on success: select the new pair and leave add mode.
export async function onNewRelationship(id: string): Promise<void> {
  await refreshRelationship(true);
  selectRelationship(id);
  setJustPaired(id);
}

export function useRelationshipFocusRefresh(): void {
  useFocusRefresh(() => refreshRelationship());
}

export {
  relationships,
  relationshipLoading,
  addingPartner,
  setAddingPartner,
  justPaired,
  setJustPaired,
};
