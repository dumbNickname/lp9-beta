import type { Archetype } from "~/lib/data/types";
import { readLocal, writeLocal } from "~/lib/storage";

// Relationship type picked at onboarding, read by the pairing flow.
export const ARCHETYPE_HINT_KEY = "archetype_hint";
const VALID_ARCHETYPES: Archetype[] = ["getting_to_know", "established_couple", "close_friends"];

export function readArchetypeHint(): Archetype {
  const raw = readLocal(ARCHETYPE_HINT_KEY);
  return raw && (VALID_ARCHETYPES as string[]).includes(raw) ? (raw as Archetype) : "getting_to_know";
}

export function writeArchetypeHint(value: string): void {
  writeLocal(ARCHETYPE_HINT_KEY, value);
}
