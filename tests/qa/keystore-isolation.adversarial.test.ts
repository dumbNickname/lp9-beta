import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  base64ToBytes,
  bytesToBase64,
  decrypt,
  encrypt,
  exportKeyRaw,
  generateKey,
  importKeyRaw,
} from "~/lib/crypto/aes";
import { deleteKey, getKey, putKey } from "~/lib/crypto/keystore";

// QA adversarial suite for PRD-21 — key handling against a REAL (faked)
// IndexedDB. Proves:
//  - key isolation: two relationships hold two distinct keys; storing one
//    never overwrites the other; deleting one leaves the other intact.
//  - the redeem-path invariant: the imported key is stored under the
//    RELATIONSHIP id, not the invite code, and decrypts the inviter's
//    ciphertext (round-trip proves it's the SAME key that crossed the QR).
//  - the inviter temp-key migration (D-21.1): key stored under
//    `invite:<code>`, migrated to the rel id, temp entry deleted.

async function freshIDB() {
  const { IDBFactory } = await import("fake-indexeddb");
  globalThis.indexedDB = new IDBFactory();
}

beforeEach(async () => {
  await freshIDB();
});

describe("PRD-21 QA: key isolation between two relationships", () => {
  it("two relationships store two different keys; neither overwrites the other", async () => {
    const kA = await generateKey();
    const kB = await generateKey();
    await putKey("relA", kA);
    await putKey("relB", kB);

    const rawA = bytesToBase64(await exportKeyRaw((await getKey("relA"))!));
    const rawB = bytesToBase64(await exportKeyRaw((await getKey("relB"))!));
    expect(rawA).not.toBe(rawB);

    // Cross-decrypt must FAIL: relA's key cannot open relB's ciphertext.
    const { ciphertext, iv } = await encrypt(kB, "b-only");
    await expect(decrypt((await getKey("relA"))!, ciphertext, iv)).rejects.toBeTruthy();
    // relB's own key still opens it.
    expect(await decrypt((await getKey("relB"))!, ciphertext, iv)).toBe("b-only");
  });

  it("redeeming/storing a second relationship key does not clobber the first", async () => {
    const kA = await generateKey();
    await putKey("relA", kA);
    const { ciphertext, iv } = await encrypt(kA, "a-secret");

    // Later, a second pairing stores a different key under a different id.
    const kB = await generateKey();
    await putKey("relB", kB);

    // relA still decrypts its own data.
    const restoredA = await getKey("relA");
    expect(await decrypt(restoredA!, ciphertext, iv)).toBe("a-secret");
  });
});

describe("PRD-21 QA: redeem path stores imported key under the RELATIONSHIP id", () => {
  it("importKeyRaw(base64) round-trips the inviter's key; stored under rel id, not code", async () => {
    // Inviter side: generate key, export to base64 for the QR payload.
    const inviterKey = await generateKey();
    const keyBase64 = bytesToBase64(await exportKeyRaw(inviterKey));
    const { ciphertext, iv } = await encrypt(inviterKey, "hello from inviter");

    // Redeemer side (mirrors PairFlow.handleDecode): RPC returns a rel id;
    // import the key from the payload base64; store under the REL id.
    const relationshipId = "rel-redeemed-1";
    const code = "CODE-abc";
    const imported = await importKeyRaw(base64ToBytes(keyBase64));
    await putKey(relationshipId, imported);

    // Stored under rel id...
    expect(await getKey(relationshipId)).not.toBeNull();
    // ...and NOT under the invite code / any code-derived id.
    expect(await getKey(code)).toBeNull();
    expect(await getKey(`invite:${code}`)).toBeNull();

    // The stored key is the SAME AES key — it decrypts the inviter's data.
    const stored = await getKey(relationshipId);
    expect(await decrypt(stored!, ciphertext, iv)).toBe("hello from inviter");
  });
});

describe("PRD-21 QA: inviter temp-key migration (D-21.1)", () => {
  it("temp key under invite:<code> migrates to rel id and temp entry is deleted", async () => {
    const code = "WXYZ7890";
    const tempId = `invite:${code}`;
    const relId = "rel-paired-9";

    const key = await generateKey();
    const { ciphertext, iv } = await encrypt(key, "waiting-inviter");

    // Inviter stored the fresh key under the temp id.
    await putKey(tempId, key);
    expect(await getKey(tempId)).not.toBeNull();

    // onPaired migration (mirrors PairFlow.onPaired):
    const temp = await getKey(tempId);
    expect(temp).not.toBeNull();
    await putKey(relId, temp!);
    await deleteKey(tempId);

    // Temp entry gone, rel id holds the working key.
    expect(await getKey(tempId)).toBeNull();
    const migrated = await getKey(relId);
    expect(migrated).not.toBeNull();
    expect(await decrypt(migrated!, ciphertext, iv)).toBe("waiting-inviter");
  });
});
