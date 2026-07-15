import { supabase } from "~/lib/supabase";
import type { Profile, ProfileUpdate } from "./types";

export async function getMyProfile(): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, locale, theme, created_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data as Profile;
}

export async function updateMyProfile(patch: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .select("id, display_name, locale, theme, created_at")
    .single();

  if (error) throw error;
  return data as Profile;
}
