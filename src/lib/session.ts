import { createSignal, onCleanup } from "solid-js";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "~/lib/supabase";

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

export { session, user, loading };
