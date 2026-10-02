import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { decrypt, encrypt, generateKey } from "~/lib/crypto/aes";
import { getKey, putKey } from "~/lib/crypto/keystore";
import {
  adoptPendingInvite,
  readPendingInvite,
  tempKeyId,
  writePendingInvite,
} from "~/lib/pairing/pendingInvite";

// Inviter's tab was in the background while the partner joined, so the
// PairFlow poll never moved the key; a store refresh must do it, or the
// inviter is asked for a recovery password that doesn't exist yet.
beforeEach(async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
});

describe("adoptPendingInvite", () => {
  it("moves the temp key onto the new pair I created and clears the invite", async () => {
    const key = await generateKey();
    await putKey(tempKeyId("C1"), key);
    writePendingInvite({ code: "C1", keyBase64: "x", knownIds: ["old"] });
    const id = await adoptPendingInvite(
      [
        { id: "old", member_a: "me" },
        { id: "joined-me", member_a: "other" },
        { id: "new", member_a: "me" },
      ],
      "me",
    );
    expect(id).toBe("new");
    expect(await getKey("new")).not.toBeNull();
    expect(await getKey(tempKeyId("C1"))).toBeNull();
    expect(readPendingInvite()).toBeNull();
    expect(await getKey("old")).toBeNull();
    expect(await getKey("joined-me")).toBeNull();
  });

  it("does nothing without a pending invite or temp key", async () => {
    expect(await adoptPendingInvite([{ id: "r", member_a: "me" }], "me")).toBeNull();
    writePendingInvite({ code: "C2", keyBase64: "x" });
    expect(await adoptPendingInvite([{ id: "r", member_a: "me" }], "me")).toBeNull();
    expect(readPendingInvite()).not.toBeNull();
  });

  it("never overwrites a pair that already has a key", async () => {
    const existing = await generateKey();
    await putKey("r", existing);
    await putKey(tempKeyId("C3"), await generateKey());
    writePendingInvite({ code: "C3", keyBase64: "x" });
    expect(await adoptPendingInvite([{ id: "r", member_a: "me" }], "me")).toBeNull();
    const { ciphertext, iv } = await encrypt(existing, "still mine");
    expect(await decrypt((await getKey("r"))!, ciphertext, iv)).toBe("still mine");
  });
});
