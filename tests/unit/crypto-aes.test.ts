import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  bytesToBase64,
  decrypt,
  encrypt,
  exportKeyRaw,
  generateKey,
  importKeyRaw,
} from "~/lib/crypto/aes";

describe("crypto/aes", () => {
  it("round-trips arbitrary UTF-8 including emoji", async () => {
    const key = await generateKey();
    const msg = "Thanks for the coffee 💚 — you noticed! ąęśćż";
    const { ciphertext, iv } = await encrypt(key, msg);
    const out = await decrypt(key, ciphertext, iv);
    expect(out).toBe(msg);
  });

  it("round-trips a 200-char string", async () => {
    const key = await generateKey();
    const msg = "a".repeat(200);
    const { ciphertext, iv } = await encrypt(key, msg);
    expect(await decrypt(key, ciphertext, iv)).toBe(msg);
  });

  it("uses a distinct IV each call (same plaintext -> different ciphertext)", async () => {
    const key = await generateKey();
    const a = await encrypt(key, "same");
    const b = await encrypt(key, "same");
    expect(bytesToBase64(a.iv)).not.toBe(bytesToBase64(b.iv));
    expect(bytesToBase64(a.ciphertext)).not.toBe(bytesToBase64(b.ciphertext));
  });

  it("fails to decrypt with the wrong key", async () => {
    const key1 = await generateKey();
    const key2 = await generateKey();
    const { ciphertext, iv } = await encrypt(key1, "secret");
    await expect(decrypt(key2, ciphertext, iv)).rejects.toBeDefined();
  });

  it("fails to decrypt tampered ciphertext", async () => {
    const key = await generateKey();
    const { ciphertext, iv } = await encrypt(key, "secret");
    ciphertext[0] = ciphertext[0]! ^ 0xff;
    await expect(decrypt(key, ciphertext, iv)).rejects.toBeDefined();
  });

  it("export/import raw key round-trips (still decrypts)", async () => {
    const key = await generateKey();
    const { ciphertext, iv } = await encrypt(key, "hello");
    const raw = await exportKeyRaw(key);
    const imported = await importKeyRaw(raw);
    expect(await decrypt(imported, ciphertext, iv)).toBe("hello");
  });

  it("base64 helpers round-trip bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 255, 128]);
    expect(Array.from(base64ToBytes(bytesToBase64(bytes)))).toEqual(
      Array.from(bytes),
    );
  });
});
