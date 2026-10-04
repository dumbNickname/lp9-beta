import { createSignal, onCleanup } from "solid-js";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "~/lib/supabase";
import { clearKeys } from "~/lib/crypto/keystore";
import { ARCHETYPE_HINT_KEY } from "~/lib/archetypeHint";
import { LAST_SEEN_PREFIX } from "~/lib/lastSeen";
import { PENDING_INVITE_KEY } from "~/lib/pairing/pendingInvite";
import { PRIVACY_KEY } from "~/lib/privacy";
import { PRIVACY_HINT_KEY } from "~/lib/privacyHint";
import { PRIVATE_COUPONS_KEY } from "~/lib/privateCoupons";
import { RECOVERY_PROMPTED_PREFIX } from "~/lib/recoveryPrompted";
import { removeLocalWhere } from "~/lib/storage";
import { ACTIVE_REL_KEY } from "~/lib/stores/relationship";

const [session, setSession] = createSignal<Session | null>(null);
const [user, setUser] = createSignal<User | null>(null);
const [loading, setLoading] = createSignal(true);

function apply(s: Session | null) {
  setSession(s);
  setUser(s?.user ?? null);
}

export async function initSession(): Promise<void> {
  try {
    const {
      data: { session: existing },
    } = await supabase.auth.getSession();

    if (existing) {
      apply(existing);
      return;
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error("Anonymous sign-in failed:", error.message);
      return;
    }
    apply(data.session);
  } finally {
    setLoading(false);
  }
}

export function subscribeToAuthChanges(): void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, s) => {
    apply(s);
  });
  onCleanup(() => subscription.unsubscribe());
}

// Built lazily: stores/relationship imports this module (cycle).
export function resetStorageKeys(): { keys: string[]; prefixes: string[] } {
  return {
    keys: [
      PENDING_INVITE_KEY,
      ARCHETYPE_HINT_KEY,
      PRIVATE_COUPONS_KEY,
      ACTIVE_REL_KEY,
      PRIVACY_KEY,
      PRIVACY_HINT_KEY,
    ],
    prefixes: [RECOVERY_PROMPTED_PREFIX, LAST_SEEN_PREFIX],
  };
}

// Local-only "Reset account" escape hatch (D-26.2). Wipes this device's
// crypto keys and pairing/recovery localStorage markers, then signs out so
// the next load starts a fresh anonymous user. It does NOT dissolve the
// server-side relationship for the partner (that is the future "unpair"
// feature). Callers should reload after this resolves.
export async function resetAccount(): Promise<void> {
  try {
    await clearKeys();
  } catch {
    // keystore unavailable; continue with the rest of the reset
  }
  const { keys, prefixes } = resetStorageKeys();
  removeLocalWhere((k) => keys.includes(k) || prefixes.some((p) => k.startsWith(p)));
  try {
    await supabase.auth.signOut();
  } catch {
    // sign-out failed; reload still forces a fresh session attempt
  }
}

export { session, user, loading };
