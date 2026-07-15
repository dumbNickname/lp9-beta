import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let instance: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (instance) return instance;

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  if (!url) {
    throw new Error(
      "Missing VITE_SUPABASE_URL. Copy .env.example to .env and fill in the project URL.",
    );
  }

  if (!key) {
    throw new Error(
      "Missing VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in the publishable/anon key.",
    );
  }

  instance = createClient(url, key);
  return instance;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabase(), prop);
  },
});
