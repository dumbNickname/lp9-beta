import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { generateKey } from "~/lib/crypto/aes";
import { putKey } from "~/lib/crypto/keystore";
import { COMMENT_MAX, decryptComment, encryptComment } from "~/lib/crypto/comments";
import { computeSpendable } from "~/lib/balance";
import { addDays, formatEventDay, localDateString, withinWindow } from "~/lib/format/date";
import { privateMode, setPrivateMode, togglePrivateMode } from "~/lib/privacy";

beforeEach(async () => {
  const { IDBFactory } = await import("fake-indexeddb");
  globalThis.indexedDB = new IDBFactory();
});

describe("crypto/comments", () => {
  it("round-trips a comment with the stored relationship key", async () => {
    const key = await generateKey();
    await putKey("rel1", key);
    const enc = await encryptComment("rel1", "  you made coffee  ");
    expect(enc!.iv.length).toBe(12);
    expect(await decryptComment(key, enc!.ciphertext, enc!.iv)).toBe("you made coffee");
  });

  it("returns null for empty/whitespace comments", async () => {
    expect(await encryptComment("rel1", "   ")).toBeNull();
  });

  it("throws (never falls back to plaintext) when the key is missing", async () => {
    await expect(encryptComment("nokey", "hi")).rejects.toThrow();
  });

  it("caps at COMMENT_MAX characters", async () => {
    const key = await generateKey();
    await putKey("rel1", key);
    const enc = await encryptComment("rel1", "x".repeat(COMMENT_MAX + 50));
    expect((await decryptComment(key, enc!.ciphertext, enc!.iv))!.length).toBe(COMMENT_MAX);
  });

  it("decrypt returns null with no key or wrong key", async () => {
    const key = await generateKey();
    await putKey("rel1", key);
    const enc = (await encryptComment("rel1", "secret"))!;
    expect(await decryptComment(null, enc.ciphertext, enc.iv)).toBeNull();
    expect(await decryptComment(await generateKey(), enc.ciphertext, enc.iv)).toBeNull();
  });
});

describe("balance", () => {
  it("sums received amounts", () => {
    expect(computeSpendable([1, 3, 5])).toBe(9);
    expect(computeSpendable([])).toBe(0);
  });

  it("subtracts escrowed and spent claims, not declined/refunded", () => {
    expect(
      computeSpendable(
        [5, 5, 5],
        [
          { status: "pending", price_at_claim: 2 },
          { status: "accepted", price_at_claim: 3 },
          { status: "delivered", price_at_claim: 4 },
          { status: "declined", price_at_claim: 100 },
          { status: "auto_refunded", price_at_claim: 100 },
        ],
      ),
    ).toBe(6);
  });
});

describe("format/date", () => {
  it("localDateString + addDays", () => {
    expect(localDateString(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-09-29", -30)).toBe("2026-08-30");
  });

  it("formatEventDay relative within a week, date after", () => {
    expect(formatEventDay("2026-09-29", "2026-09-29")).toBe("today");
    expect(formatEventDay("2026-09-28", "2026-09-29")).toBe("yesterday");
    expect(formatEventDay("2026-09-26", "2026-09-29")).toBe("3 days ago");
    expect(formatEventDay("2026-09-01", "2026-09-29")).toBe("Sep 1");
  });

  it("withinWindow", () => {
    const now = Date.parse("2026-09-29T12:00:00Z");
    expect(withinWindow("2026-09-29T11:56:00Z", 5 * 60_000, now)).toBe(true);
    expect(withinWindow("2026-09-29T11:55:00Z", 5 * 60_000, now)).toBe(false);
  });
});

describe("privacy mode", () => {
  it("defaults ON and toggles", () => {
    expect(privateMode()).toBe(true);
    togglePrivateMode();
    expect(privateMode()).toBe(false);
    setPrivateMode(true);
    expect(privateMode()).toBe(true);
  });
});
