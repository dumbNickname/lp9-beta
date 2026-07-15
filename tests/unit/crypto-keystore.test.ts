import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { generateKey, encrypt, decrypt } from "~/lib/crypto/aes";
import { deleteKey, getKey, hasKey, putKey } from "~/lib/crypto/keystore";

async function freshIDB() {
  const { IDBFactory } = await import("fake-indexeddb");
  globalThis.indexedDB = new IDBFactory();
}

describe("crypto/keystore", () => {
  beforeEach(async () => {
    await freshIDB();
  });

  it("put then get returns a usable key (decrypts data)", async () => {
    const key = await generateKey();
    const { ciphertext, iv } = await encrypt(key, "hello");
    await putKey("rel1", key);

    const restored = await getKey("rel1");
    expect(restored).not.toBeNull();
    expect(await decrypt(restored!, ciphertext, iv)).toBe("hello");
  });

  it("getKey for unknown relationship returns null", async () => {
    expect(await getKey("nope")).toBeNull();
  });

  it("deleteKey removes it", async () => {
    const key = await generateKey();
    await putKey("rel1", key);
    await deleteKey("rel1");
    expect(await getKey("rel1")).toBeNull();
  });

  it("hasKey reflects presence", async () => {
    const key = await generateKey();
    expect(await hasKey("rel1")).toBe(false);
    await putKey("rel1", key);
    expect(await hasKey("rel1")).toBe(true);
  });

  it("two relationships' keys do not collide; deleting one keeps the other", async () => {
    const k1 = await generateKey();
    const k2 = await generateKey();
    await putKey("relA", k1);
    await putKey("relB", k2);

    const { ciphertext, iv } = await encrypt(k2, "b-secret");
    await deleteKey("relA");

    expect(await getKey("relA")).toBeNull();
    const restoredB = await getKey("relB");
    expect(restoredB).not.toBeNull();
    expect(await decrypt(restoredB!, ciphertext, iv)).toBe("b-secret");
  });

  it("key persists across a new DB connection (simulated reload)", async () => {
    const key = await generateKey();
    const { ciphertext, iv } = await encrypt(key, "persist");
    await putKey("rel1", key);

    // getKey opens a fresh connection each call
    const restored = await getKey("rel1");
    expect(await decrypt(restored!, ciphertext, iv)).toBe("persist");
  });
});
