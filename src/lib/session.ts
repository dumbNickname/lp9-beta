import { createSignal, onCleanup } from "solid-js";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "~/lib/supabase";
import { clearKeys } from "~/lib/crypto/keystore";

const [session, setSession] = createSignal<Session | null>(null);
const [user, setUser] = createSignal<User | null>(null);
const [loading, setLoading] = createSignal(true);

function apply(s: Session | null) {
  setSession(s);
  setUser(s?.user ?? null);
}

export async function initSession(): Promise<void> {
  const {
    data: { session: existing },
  } = await supabase.auth.getSession();

  if (existing) {
    apply(existing);
    setLoading(false);
    return;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("Anonymous sign-in failed:", error.message);
    setLoading(false);
    return;
  }
  apply(data.session);
  setLoading(false);
}

export function subscribeToAuthChanges(): void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, s) => {
    apply(s);
  });
  onCleanup(() => subscription.unsubscribe());
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
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const k = localStorage.key(i);
      if (
        k &&
        (k === "pair_invite_pending" ||
          k === "archetype_hint" ||
          k.startsWith("recovery_prompted:"))
      ) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    // storage unavailable
  }
  try {
    await supabase.auth.signOut();
  } catch {
    // sign-out failed; reload still forces a fresh session attempt
  }
}

export { session, user, loading };
