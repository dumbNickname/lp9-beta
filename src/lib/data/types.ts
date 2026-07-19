export interface Profile {
  id: string;
  display_name: string | null;
  locale: "en" | "pl" | "de";
  theme: "light" | "dark" | "system";
  created_at: string;
}

export type ProfileUpdate = Partial<Pick<Profile, "display_name" | "locale" | "theme">>;

export type Archetype =
  | "getting_to_know"
  | "established_couple"
  | "close_friends";

export type RelationshipStatus = "active" | "archived";

export interface Relationship {
  id: string;
  member_a: string;
  member_b: string;
  archetype: Archetype;
  status: RelationshipStatus;
  created_at: string;
  paired_at: string | null;
}
