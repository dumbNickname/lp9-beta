import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import {
  base64ToBytes,
  bytesToBase64,
  decrypt,
  encrypt,
  exportKeyRaw,
  generateKey,
} from "~/lib/crypto/aes";
import { getKey, putKey } from "~/lib/crypto/keystore";
import {
  DEFAULT_ITERATIONS,
  SALT_BYTES,
  WRAP_ALGO,
  deriveWrappingKey,
  unwrapKey,
  wrapKey,
} from "~/lib/crypto/recovery";

// QA adversarial suite for PRD-22 (password-wrapped key recovery), crypto
// boundary. Runs entirely on Node WebCrypto + fake-indexeddb. Proves the
// wrap/unwrap primitive is a real E2E key-recovery boundary, that a wrong
// password / tampered / malformed blob cleanly REJECTS and leaves the
// keystore untouched, and that security does not depend on trusting the
// stored iteration count.
//
// PBKDF2 is derived with a LOW iteration count here for speed; the
// production DEFAULT constant is asserted separately.
const FAST_ITERS = 1000;

async function freshIDB() {
  const { IDBFactory } = await import("fake-indexeddb");
  globalThis.indexedDB = new IDBFactory();
}

function randomSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

beforeEach(async () => {
  await freshIDB();
});

describe("PRD-22 QA: production wrap parameters are pinned", () => {
  it("DEFAULT_ITERATIONS is exactly 600000, algo PBKDF2-SHA256, salt 16 bytes", () => {
    expect(DEFAULT_ITERATIONS).toBe(600000);
    expect(WRAP_ALGO).toBe("PBKDF2-SHA256");
    expect(SALT_BYTES).toBe(16);
  });
});

describe("PRD-22 QA: round-trip recovers the SAME key (not merely 'a' key)", () => {
  it("unwrap yields a key that decrypts a message the ORIGINAL relKey encrypted", async () => {
    const relKey = await generateKey();
    // Bind the proof to the original key: encrypt BEFORE wrapping.
    const { ciphertext, iv } = await encrypt(relKey, "you did the dishes, thank you");
    const originalRaw = bytesToBase64(await exportKeyRaw(relKey));

    const salt = randomSalt();
    const wrappingKey = await deriveWrappingKey("pw-correct", salt, FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    // New device: independent derivation from the same password + salt.
    const wrappingKey2 = await deriveWrappingKey("pw-correct", salt, FAST_ITERS);
    const restored = await unwrapKey(blob, wrappingKey2);

    // Same raw bytes...
    expect(bytesToBase64(await exportKeyRaw(restored))).toBe(originalRaw);
    // ...and it actually decrypts the original ciphertext.
    expect(await decrypt(restored, ciphertext, iv)).toBe("you did the dishes, thank you");
  });
});

describe("PRD-22 QA: wrong password -> reject, NO key stored", () => {
  it("restore-shaped flow with wrong password rejects and leaves keystore untouched", async () => {
    const relId = "rel-wrongpw";
    const relKey = await generateKey();
    const salt = randomSalt();
    const wrappingKey = await deriveWrappingKey("the-right-one", salt, FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    // Simulate RecoveryPassword.handleRestore with the WRONG password.
    const wrongWrapping = await deriveWrappingKey("not-the-right-one", salt, FAST_ITERS);
    let threw = false;
    try {
      const key = await unwrapKey(blob, wrongWrapping);
      // Would only reach here on success; mirror the component's putKey.
      await putKey(relId, key);
    } catch {
      threw = true;
    }

    expect(threw).toBe(true);
    // Keystore must be untouched: no key was ever stored.
    expect(await getKey(relId)).toBeNull();
  });
});

describe("PRD-22 QA: tampered blob -> GCM auth fails, NO key stored", () => {
  it("flipping a ciphertext byte rejects and stores no key", async () => {
    const relId = "rel-tamper-ct";
    const relKey = await generateKey();
    const salt = randomSalt();
    const wrappingKey = await deriveWrappingKey("pw", salt, FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    // Flip a ciphertext byte (past the 12-byte IV).
    blob[20] = blob[20]! ^ 0xff;

    let threw = false;
    try {
      const key = await unwrapKey(blob, wrappingKey);
      await putKey(relId, key);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(await getKey(relId)).toBeNull();
  });

  it("flipping an IV byte rejects and stores no key", async () => {
    const relId = "rel-tamper-iv";
    const relKey = await generateKey();
    const salt = randomSalt();
    const wrappingKey = await deriveWrappingKey("pw", salt, FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    // Flip a byte inside the IV (index < 12).
    blob[0] = blob[0]! ^ 0xff;

    let threw = false;
    try {
      const key = await unwrapKey(blob, wrappingKey);
      await putKey(relId, key);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(await getKey(relId)).toBeNull();
  });
});

describe("PRD-22 QA: malformed / truncated blob -> clean reject, no key stored", () => {
  it("empty blob rejects cleanly", async () => {
    const wrappingKey = await deriveWrappingKey("pw", randomSalt(), FAST_ITERS);
    await expect(unwrapKey(new Uint8Array(0), wrappingKey)).rejects.toBeDefined();
  });

  it("blob shorter than the 12-byte IV rejects cleanly (no crash, no key stored)", async () => {
    const relId = "rel-truncated";
    const wrappingKey = await deriveWrappingKey("pw", randomSalt(), FAST_ITERS);
    // 5 bytes: shorter than the IV; slice(0,12) yields 5 bytes, slice(12) empty.
    let threw = false;
    try {
      const key = await unwrapKey(new Uint8Array([1, 2, 3, 4, 5]), wrappingKey);
      await putKey(relId, key);
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
    expect(await getKey(relId)).toBeNull();
  });

  it("blob of exactly IV length (no ciphertext) rejects cleanly", async () => {
    const wrappingKey = await deriveWrappingKey("pw", randomSalt(), FAST_ITERS);
    await expect(unwrapKey(new Uint8Array(12), wrappingKey)).rejects.toBeDefined();
  });
});

describe("PRD-22 QA: blob layout is iv(12) || ciphertext, unwrap splits at 12", () => {
  it("manually re-assembling iv||ct from the first 12 bytes decrypts identically", async () => {
    const relKey = await generateKey();
    const salt = randomSalt();
    const wrappingKey = await deriveWrappingKey("pw", salt, FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    // 32-byte AES-256 raw + 16-byte GCM tag = 48 ct; +12 IV = 60.
    expect(blob.length).toBe(60);

    // Split at 12 ourselves and decrypt the raw key bytes directly with the
    // wrapping key -> proves the layout the code documents.
    const iv = blob.slice(0, 12);
    const ct = blob.slice(12);
    const rawBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, wrappingKey, ct);
    expect(new Uint8Array(rawBuf).length).toBe(32);
    expect(new Uint8Array(rawBuf)).toEqual(await exportKeyRaw(relKey));
  });
});

describe("PRD-22 QA: salt independence", () => {
  it("same password, different salt -> different wrapping key -> cannot cross-unwrap", async () => {
    const relKey = await generateKey();
    const wrappingKey = await deriveWrappingKey("same-pw", randomSalt(), FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    const otherSaltKey = await deriveWrappingKey("same-pw", randomSalt(), FAST_ITERS);
    await expect(unwrapKey(blob, otherSaltKey)).rejects.toBeDefined();
  });
});

describe("PRD-22 QA: iteration count is not a trust boundary", () => {
  // The stored iteration count is an input to derivation, not an auth token.
  // A right password + right iteration count unwraps. A wrong iteration
  // count (attacker downgrade of the stored value) simply derives a
  // DIFFERENT wrapping key and fails to unwrap -- it never lets a wrong
  // password succeed, and it never lets the correct password succeed with a
  // mismatched count. Document that precisely.
  it("correct password with the SAME iteration count used at wrap-time unwraps", async () => {
    const relKey = await generateKey();
    const salt = randomSalt();
    const wrappingKey = await deriveWrappingKey("pw", salt, FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    const same = await deriveWrappingKey("pw", salt, FAST_ITERS);
    await expect(unwrapKey(blob, same)).resolves.toBeDefined();
  });

  it("correct password but a DOWNGRADED iteration count fails to unwrap (no leak)", async () => {
    const relKey = await generateKey();
    const salt = randomSalt();
    const wrappingKey = await deriveWrappingKey("pw", salt, FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    // Attacker downgrades the stored iteration count restore would use.
    const downgraded = await deriveWrappingKey("pw", salt, 100);
    await expect(unwrapKey(blob, downgraded)).rejects.toBeDefined();
  });

  it("wrong password does NOT succeed even if the iteration count is lowered", async () => {
    const relKey = await generateKey();
    const salt = randomSalt();
    const wrappingKey = await deriveWrappingKey("right", salt, FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    const attacker = await deriveWrappingKey("wrong", salt, 1);
    await expect(unwrapKey(blob, attacker)).rejects.toBeDefined();
  });
});

describe("PRD-22 QA: restore of a QR-transferred key round-trips", () => {
  it("a key exported to base64 (QR) can be re-imported, wrapped, and unwrapped", async () => {
    // Mirrors the real lifecycle: inviter key -> QR base64 -> imported ->
    // later wrapped with a recovery password -> unwrapped on a new device.
    const { importKeyRaw } = await import("~/lib/crypto/aes");
    const inviter = await generateKey();
    const b64 = bytesToBase64(await exportKeyRaw(inviter));
    const { ciphertext, iv } = await encrypt(inviter, "shared secret");

    const imported = await importKeyRaw(base64ToBytes(b64));
    const salt = randomSalt();
    const wk = await deriveWrappingKey("pw", salt, FAST_ITERS);
    const blob = await wrapKey(imported, wk);

    const restored = await unwrapKey(blob, await deriveWrappingKey("pw", salt, FAST_ITERS));
    expect(await decrypt(restored, ciphertext, iv)).toBe("shared secret");
  });
});
