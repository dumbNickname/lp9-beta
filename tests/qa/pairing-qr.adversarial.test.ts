import { describe, expect, it } from "vitest";
import { bytesToBase64 } from "~/lib/crypto/aes";
import { buildInvitePayload, parseInvitePayload } from "~/lib/pairing/qr";

// QA adversarial suite for PRD-19. Targets parseInvitePayload /
// buildInvitePayload. Contract from the PRD:
//   - format is `v1:<code>:<keyBase64>`
//   - parse splits on the FIRST TWO colons only (key is verbatim tail)
//   - parse returns null (never throws) on any malformed input
//   - keyBase64 uses standard base64 (A-Za-z0-9+/=), never contains ':'
//
// QA does NOT validate that the key is well-formed base64 here — Dev
// notes flag that as PRD-17/PRD-20 scope. These tests only assert the
// parse contract: structural correctness + total absence of throws.

describe("PRD-19 QA: parseInvitePayload never throws, returns null on bad input", () => {
  // Every conceivable weird input. The single hard invariant: no throw.
  const badInputs: unknown[] = [
    // missing / partial fields
    "",
    " ",
    "   ",
    "\t\n",
    "v1",
    "v1:",
    "v1:code",
    "v1:code:", // empty key
    "v1::key", // empty code
    "v1::", // both empty
    ":",
    "::",
    ":::::",
    "v1:::::",
    // wrong / absent version prefix
    "v2:code:key",
    "V1:code:key",
    "v10:code:key",
    " v1:code:key", // leading space breaks version match
    ":code:key",
    "code:key",
    "code:key:extra",
    "garbage",
    "no-colons-at-all",
    // injected separators in wrong places
    "v1: :key", // code is a single space (non-empty -> parses, but shouldn't throw)
    "v1:code : key",
    "::v1:code:key",
    "v1:v1:code:key",
    // oversized garbage key
    `v1:code:${"A".repeat(100000)}`,
    `v1:code:${"!@#$%^&*()".repeat(5000)}`,
    // garbage (non-base64) key — parse must NOT validate, just not throw
    "v1:code:not valid base64 !!! ###",
    "v1:code:====",
    // weird unicode / RTL / emoji / SQL-ish where the type allows string
    "v1:\u0000:\u0000",
    "v1:\uFFFF:\uFFFF",
    "v1:code:\u202Ereversed\u202C",
    "v1:😀:🔑🔑🔑",
    "v1:'; DROP TABLE relationships;--:key",
    "v1:code:\\x00\\x01",
    "v1:\r\n:key",
    // non-string inputs (type system says string, callers may lie)
    null,
    undefined,
    42,
    0,
    NaN,
    true,
    false,
    {},
    [],
    { code: "x", keyBase64: "y" },
    ["v1", "code", "key"],
    Symbol("v1:code:key"),
    () => "v1:code:key",
    new Date(),
    BigInt(1),
  ];

  it("never throws on any adversarial input", () => {
    for (const input of badInputs) {
      expect(() => parseInvitePayload(input as string), `input=${String(input)}`).not.toThrow();
    }
  });

  it("returns null (not a truthy object) for every structurally-invalid input", () => {
    // Subset that must be null: non-strings, wrong version, missing fields,
    // empty code, empty key. (Note: `v1: :key` and unicode-code cases have a
    // non-empty code + non-empty key, so they legitimately parse — excluded.)
    const mustBeNull: unknown[] = [
      "",
      " ", // single colon-less string
      "v1",
      "v1:",
      "v1:code",
      "v1:code:", // empty key
      "v1::key", // empty code
      "v1::",
      ":",
      "::",
      "v2:code:key",
      "V1:code:key",
      "v10:code:key",
      " v1:code:key",
      ":code:key",
      "code:key",
      "garbage",
      null,
      undefined,
      42,
      NaN,
      true,
      {},
      [],
      Symbol("x"),
      () => {},
      new Date(),
    ];
    for (const input of mustBeNull) {
      expect(parseInvitePayload(input as string), `input=${String(input)}`).toBeNull();
    }
  });
});

describe("PRD-19 QA: split-on-first-two-colons preserves key verbatim", () => {
  it("does not truncate a key that (hypothetically) contains colons", () => {
    // Base64 never contains ':', but the parse rule must be robust: the
    // entire tail after the 2nd colon is the key, colons and all.
    const parsed = parseInvitePayload("v1:CODE:aa:bb:cc:dd");
    expect(parsed).toEqual({ code: "CODE", keyBase64: "aa:bb:cc:dd" });
  });

  it("preserves + / = in the key tail intact (no split-limit truncation)", () => {
    const key = "AB+/cd==EF+/gh==";
    const parsed = parseInvitePayload(`v1:CODE:${key}`);
    expect(parsed?.keyBase64).toBe(key);
  });

  it("code stops at the second colon; key is everything after", () => {
    const parsed = parseInvitePayload("v1:my-code:key-with-no-colons");
    expect(parsed).toEqual({ code: "my-code", keyBase64: "key-with-no-colons" });
  });
});

describe("PRD-19 QA: round-trip integrity for ALL valid AES keys", () => {
  // buildInvitePayload -> parseInvitePayload must be lossless for any
  // standard-base64 key. Since base64 has no ':', the format is unambiguous.
  it("round-trips a real 32-byte AES key base64 containing + / =", () => {
    // Bytes chosen so btoa output includes +, /, and = padding.
    const bytes = new Uint8Array([
      251, 255, 62, 63, 254, 240, 15, 240, 255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    ]);
    const keyB64 = bytesToBase64(bytes);
    expect(keyB64).toMatch(/[+/=]/); // honesty check: exercises special chars
    const parsed = parseInvitePayload(buildInvitePayload("CODE-123", keyB64));
    expect(parsed).toEqual({ code: "CODE-123", keyBase64: keyB64 });
  });

  it("round-trips 500 random 32-byte keys losslessly (fuzz)", () => {
    for (let i = 0; i < 500; i++) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const keyB64 = bytesToBase64(bytes);
      const code = `code-${i}`;
      const parsed = parseInvitePayload(buildInvitePayload(code, keyB64));
      expect(parsed, `iteration ${i} keyB64=${keyB64}`).toEqual({
        code,
        keyBase64: keyB64,
      });
      // And the parsed key must decode back to the original bytes.
      expect(parsed?.keyBase64).toBe(keyB64);
    }
  });

  it("round-trips keys of all base64 padding lengths (0, 1, 2 pad chars)", () => {
    for (const len of [30, 31, 32]) {
      const bytes = new Uint8Array(len);
      crypto.getRandomValues(bytes);
      const keyB64 = bytesToBase64(bytes);
      const parsed = parseInvitePayload(buildInvitePayload("c", keyB64));
      expect(parsed?.keyBase64, `len=${len} b64=${keyB64}`).toBe(keyB64);
    }
  });

  it("round-trips a code containing base64-like chars and hyphens/unicode", () => {
    for (const code of ["ABCD1234", "aZ09", "with-hyphen", "üñíçødé", "😀"]) {
      const keyB64 = bytesToBase64(new Uint8Array([1, 2, 3]));
      const parsed = parseInvitePayload(buildInvitePayload(code, keyB64));
      expect(parsed, `code=${code}`).toEqual({ code, keyBase64: keyB64 });
    }
  });
});
