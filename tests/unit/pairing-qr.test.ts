import { describe, expect, it } from "vitest";
import { bytesToBase64 } from "~/lib/crypto/aes";
import { buildInvitePayload, parseInvitePayload } from "~/lib/pairing/qr";

// A real 32-byte AES key whose base64 encoding contains `+`, `/`, and `=`.
// Verified below so the test stays honest if the bytes ever change.
const KEY_BYTES = new Uint8Array([
  255, 254, 251, 63, 62, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
]);
const KEY_B64 = bytesToBase64(KEY_BYTES);

describe("pairing/qr payload", () => {
  it("test key base64 exercises + / = characters", () => {
    expect(KEY_B64).toMatch(/[+/=]/);
  });

  it("round-trips code + key (key with + / =)", () => {
    const payload = buildInvitePayload("ABCD1234", KEY_B64);
    expect(payload).toBe(`v1:ABCD1234:${KEY_B64}`);
    const parsed = parseInvitePayload(payload);
    expect(parsed).toEqual({ code: "ABCD1234", keyBase64: KEY_B64 });
  });

  it("preserves a key containing colons is impossible (base64 has none), but rest-of-string keeps + / =", () => {
    const parsed = parseInvitePayload(buildInvitePayload("code", "a+/b=="));
    expect(parsed).toEqual({ code: "code", keyBase64: "a+/b==" });
  });

  it("returns null on wrong version", () => {
    expect(parseInvitePayload(`v2:ABCD:${KEY_B64}`)).toBeNull();
    expect(parseInvitePayload(`:ABCD:${KEY_B64}`)).toBeNull();
    expect(parseInvitePayload(`V1:ABCD:${KEY_B64}`)).toBeNull();
  });

  it("returns null on missing fields / too few parts", () => {
    expect(parseInvitePayload("")).toBeNull();
    expect(parseInvitePayload("v1")).toBeNull();
    expect(parseInvitePayload("v1:ABCD")).toBeNull();
  });

  it("returns null on empty code or empty key", () => {
    expect(parseInvitePayload(`v1::${KEY_B64}`)).toBeNull();
    expect(parseInvitePayload("v1:ABCD:")).toBeNull();
    expect(parseInvitePayload("v1::")).toBeNull();
  });

  it("never throws on adversarial input", () => {
    const inputs: unknown[] = [
      "",
      ":",
      "::",
      ":::::",
      "v1:::::",
      "garbage",
      "v1:a:b:c:d:e",
      null,
      undefined,
      42,
    ];
    for (const input of inputs) {
      expect(() => parseInvitePayload(input as string)).not.toThrow();
    }
  });

  it("keeps extra colons as part of the key (split on first two only)", () => {
    // A key can never contain ':', but proving the split rule is robust:
    const parsed = parseInvitePayload("v1:CODE:aa:bb:cc");
    expect(parsed).toEqual({ code: "CODE", keyBase64: "aa:bb:cc" });
  });
});
