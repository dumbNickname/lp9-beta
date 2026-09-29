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

// Read-only preview of an invite for the join confirm view (PRD-25, D-25.2).
// Never carries key material; the AES key lives only in the invite link.
export interface PairInvitePeek {
  display_name: string | null;
  archetype: Archetype;
}

export interface Relationship {
  id: string;
  member_a: string;
  member_b: string;
  archetype: Archetype;
  status: RelationshipStatus;
  created_at: string;
  paired_at: string | null;
}

// The password-wrapped-key columns on a relationship (DESIGN.md §12b).
// Decoded to bytes for use in the crypto layer; null until a recovery
// password has been set.
export interface RelationshipWrap {
  wrapped_key_blob: Uint8Array;
  wrap_salt: Uint8Array;
  wrap_iterations: number;
  wrap_algo: string;
}

export type HeartAmount = 1 | 2 | 3 | 4 | 5;

// A heart event (DESIGN.md §13a). Comment bytes are AES-GCM ciphertext;
// decryption happens client-side (src/lib/crypto/comments.ts).
export interface Point {
  id: string;
  relationship_id: string;
  giver_id: string;
  receiver_id: string;
  amount: HeartAmount;
  comment_ciphertext: Uint8Array | null;
  comment_iv: Uint8Array | null;
  edited_at: string | null;
  event_date: string;
  created_at: string;
}

export interface EncryptedComment {
  ciphertext: Uint8Array;
  iv: Uint8Array;
}
