import { describe, expect, it } from "vitest";
import { decrypt, encrypt, generateKey } from "~/lib/crypto/aes";
import {
  DEFAULT_ITERATIONS,
  SALT_BYTES,
  WRAP_ALGO,
  deriveWrappingKey,
  unwrapKey,
  wrapKey,
} from "~/lib/crypto/recovery";

// 600k PBKDF2 iterations is slow; the round-trip tests use a small count.
// A separate assertion pins the DEFAULT constant to the real 600000.
const FAST_ITERS = 1000;

function randomSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

describe("crypto/recovery", () => {
  it("pins wrap parameters (600k / PBKDF2-SHA256 / 16-byte salt)", () => {
    expect(DEFAULT_ITERATIONS).toBe(600000);
    expect(WRAP_ALGO).toBe("PBKDF2-SHA256");
    expect(SALT_BYTES).toBe(16);
  });

  it("derive -> wrap -> unwrap recovers a key that decrypts the original message", async () => {
    const relKey = await generateKey();
    const { ciphertext, iv } = await encrypt(relKey, "thanks for noticing");

    const salt = randomSalt();
    const wrappingKey = await deriveWrappingKey("correct horse", salt, FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    // Fresh derivation from the same password + salt (as a new device would).
    const wrappingKey2 = await deriveWrappingKey("correct horse", salt, FAST_ITERS);
    const restored = await unwrapKey(blob, wrappingKey2);

    expect(await decrypt(restored, ciphertext, iv)).toBe("thanks for noticing");
  });

  it("wrong password fails to unwrap", async () => {
    const relKey = await generateKey();
    const salt = randomSalt();
    const wrappingKey = await deriveWrappingKey("right", salt, FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    const wrongKey = await deriveWrappingKey("wrong", salt, FAST_ITERS);
    await expect(unwrapKey(blob, wrongKey)).rejects.toBeDefined();
  });

  it("tampered blob fails to unwrap", async () => {
    const relKey = await generateKey();
    const salt = randomSalt();
    const wrappingKey = await deriveWrappingKey("pw", salt, FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);
    blob[blob.length - 1] = blob[blob.length - 1]! ^ 0xff;
    await expect(unwrapKey(blob, wrappingKey)).rejects.toBeDefined();
  });

  it("different salt yields a different wrapping key (cannot unwrap)", async () => {
    const relKey = await generateKey();
    const wrappingKey = await deriveWrappingKey("pw", randomSalt(), FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    const otherKey = await deriveWrappingKey("pw", randomSalt(), FAST_ITERS);
    await expect(unwrapKey(blob, otherKey)).rejects.toBeDefined();
  });

  it("blob layout is iv(12) || ciphertext", async () => {
    const relKey = await generateKey();
    const wrappingKey = await deriveWrappingKey("pw", randomSalt(), FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);
    // Raw AES-256 key is 32 bytes; GCM adds a 16-byte tag -> 48 bytes ct.
    // With a 12-byte IV prefix the blob is 60 bytes.
    expect(blob.length).toBe(12 + 32 + 16);
  });
});
