import { exportKeyRaw, importKeyRaw } from "~/lib/crypto/aes";

// Wrap parameters (DESIGN.md §12b, no-human-decisions D-22.1).
export const DEFAULT_ITERATIONS = 600000;
export const WRAP_ALGO = "PBKDF2-SHA256";
export const SALT_BYTES = 16;

const IV_BYTES = 12;

// Derive a 256-bit AES-GCM wrapping key from a password via PBKDF2-SHA256.
// The password is imported as raw PBKDF2 key material, then stretched with
// the per-relationship salt into an AES-GCM key usable for encrypt/decrypt.
export async function deriveWrappingKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

// Wrap a relationship key: export it raw, AES-GCM encrypt those bytes with
// the wrapping key and a fresh 12-byte IV. Returns `iv || ciphertext`.
export async function wrapKey(
  relKey: CryptoKey,
  wrappingKey: CryptoKey,
): Promise<Uint8Array> {
  const raw = await exportKeyRaw(relKey);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const buf = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    raw,
  );
  const ct = new Uint8Array(buf);
  const blob = new Uint8Array(iv.length + ct.length);
  blob.set(iv, 0);
  blob.set(ct, iv.length);
  return blob;
}

// Unwrap a blob (`iv || ciphertext`) with the wrapping key back into a
// relationship AES-GCM key. Throws if the password is wrong or the blob is
// tampered (AES-GCM auth failure); callers map that to "couldn't unlock".
export async function unwrapKey(
  blob: Uint8Array,
  wrappingKey: CryptoKey,
): Promise<CryptoKey> {
  const iv = blob.slice(0, IV_BYTES);
  const ct = blob.slice(IV_BYTES);
  const buf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    ct,
  );
  return importKeyRaw(new Uint8Array(buf));
}
