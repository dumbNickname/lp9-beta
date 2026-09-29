import { decrypt, encrypt } from "~/lib/crypto/aes";
import { getKey } from "~/lib/crypto/keystore";
import type { EncryptedComment } from "~/lib/data/types";

export const COMMENT_MAX = 200;

// E2E comment encryption (DESIGN.md §12a). Returns null for an empty
// comment. Throws when the relationship key is absent so callers can never
// silently fall back to sending plaintext.
export async function encryptComment(
  relId: string,
  text: string,
): Promise<EncryptedComment | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const key = await getKey(relId);
  if (!key) throw new Error("comment key unavailable");
  return encrypt(key, trimmed.slice(0, COMMENT_MAX));
}

// Returns null when the key is missing or decryption fails (wrong key,
// tampered ciphertext). Never throws.
export async function decryptComment(
  key: CryptoKey | null,
  ciphertext: Uint8Array,
  iv: Uint8Array,
): Promise<string | null> {
  if (!key) return null;
  try {
    return await decrypt(key, ciphertext, iv);
  } catch {
    return null;
  }
}
