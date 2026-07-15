export interface Profile {
  id: string;
  display_name: string | null;
  locale: "en" | "pl" | "de";
  theme: "light" | "dark" | "system";
  created_at: string;
}

export type ProfileUpdate = Partial<Pick<Profile, "display_name" | "locale" | "theme">>;
