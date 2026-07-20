import { describe, expect, it } from "vitest";
import { bytesToBase64 } from "~/lib/crypto/aes";
import {
  buildInvitePayload,
  buildInviteUrl,
  normalizeScannedInput,
  parseInviteUrl,
} from "~/lib/pairing/qr";

// A real 32-byte AES key whose base64 encoding contains `+`, `/`, and `=`,
// exercising the fragment encode/decode round-trip.
const KEY_BYTES = new Uint8Array([
  255, 254, 251, 63, 62, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
]);
const KEY_B64 = bytesToBase64(KEY_BYTES);
const PAYLOAD = buildInvitePayload("ABCD1234", KEY_B64);

describe("buildInviteUrl / parseInviteUrl", () => {
  it("test key base64 exercises + / = characters", () => {
    expect(KEY_B64).toMatch(/[+/=]/);
  });

  it("builds `<origin><basePath>app#pair=<encoded>`", () => {
    const url = buildInviteUrl(PAYLOAD, {
      origin: "https://example.com",
      basePath: "/lp9-beta/",
    });
    expect(url).toBe(
      `https://example.com/lp9-beta/app#pair=${encodeURIComponent(PAYLOAD)}`,
    );
  });

  it("normalizes basePath (missing/trailing slashes, root)", () => {
    expect(
      buildInviteUrl(PAYLOAD, { origin: "https://x.io", basePath: "lp9-beta" }),
    ).toContain("https://x.io/lp9-beta/app#pair=");
    expect(
      buildInviteUrl(PAYLOAD, { origin: "https://x.io", basePath: "/" }),
    ).toContain("https://x.io/app#pair=");
    expect(
      buildInviteUrl(PAYLOAD, { origin: "https://x.io", basePath: "" }),
    ).toContain("https://x.io/app#pair=");
  });

  it("trims a trailing slash on origin", () => {
    expect(
      buildInviteUrl(PAYLOAD, { origin: "https://x.io/", basePath: "/" }),
    ).toContain("https://x.io/app#pair=");
  });

  it("round-trips the payload including + / = through the fragment", () => {
    const url = buildInviteUrl(PAYLOAD, {
      origin: "https://example.com",
      basePath: "/lp9-beta/",
    });
    expect(parseInviteUrl(url)).toBe(PAYLOAD);
  });

  it("extracts `pair` from a combined fragment with other params", () => {
    const url = `https://x.io/app#a=1&pair=${encodeURIComponent(PAYLOAD)}&b=2`;
    expect(parseInviteUrl(url)).toBe(PAYLOAD);
  });

  it("returns null on no fragment / no pair key / empty value", () => {
    expect(parseInviteUrl("https://x.io/app")).toBeNull();
    expect(parseInviteUrl("https://x.io/app#")).toBeNull();
    expect(parseInviteUrl("https://x.io/app#other=1")).toBeNull();
    expect(parseInviteUrl("https://x.io/app#pair=")).toBeNull();
  });

  it("returns null on malformed percent-encoding, never throws", () => {
    expect(() => parseInviteUrl("https://x.io/app#pair=%")).not.toThrow();
    expect(parseInviteUrl("https://x.io/app#pair=%")).toBeNull();
  });

  it("never throws on adversarial / non-string input", () => {
    const inputs: unknown[] = [
      "",
      "#",
      "##",
      "junk",
      "http://[::1]#pair=x",
      null,
      undefined,
      42,
    ];
    for (const input of inputs) {
      expect(() => parseInviteUrl(input as string)).not.toThrow();
    }
  });
});

describe("normalizeScannedInput", () => {
  it("accepts a full invite URL and returns the bare payload", () => {
    const url = buildInviteUrl(PAYLOAD, {
      origin: "https://example.com",
      basePath: "/lp9-beta/",
    });
    expect(normalizeScannedInput(url)).toBe(PAYLOAD);
  });

  it("accepts a bare payload unchanged", () => {
    expect(normalizeScannedInput(PAYLOAD)).toBe(PAYLOAD);
  });

  it("trims surrounding whitespace on a bare payload", () => {
    expect(normalizeScannedInput(`  ${PAYLOAD}  `)).toBe(PAYLOAD);
  });

  it("returns null for a URL with a fragment but no pair key", () => {
    expect(normalizeScannedInput("https://x.io/app#other=1")).toBeNull();
  });

  it("returns null for empty / junk-with-no-fragment... returns the string only if non-empty bare", () => {
    expect(normalizeScannedInput("")).toBeNull();
    expect(normalizeScannedInput("   ")).toBeNull();
    // A bare junk string (no `#`) is returned as-is; parseInvitePayload
    // rejects it downstream. This is intentional — normalization does not
    // validate the payload format.
    expect(normalizeScannedInput("not-an-invite")).toBe("not-an-invite");
  });

  it("never throws on adversarial / non-string input", () => {
    const inputs: unknown[] = [null, undefined, 42, {}, []];
    for (const input of inputs) {
      expect(() =>
        normalizeScannedInput(input as string),
      ).not.toThrow();
      expect(normalizeScannedInput(input as string)).toBeNull();
    }
  });
});
