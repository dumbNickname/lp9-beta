import { describe, expect, it } from "vitest";
import { bytesToBase64 } from "~/lib/crypto/aes";
import {
  buildInvitePayload,
  buildInviteUrl,
  normalizeScannedInput,
  parseInviteUrl,
} from "~/lib/pairing/qr";

// QA adversarial suite for PRD-24 — deep-link invite URL helpers.
//
// Contract (PRD-24 / D-24.1):
//   - buildInviteUrl(payload) -> `<origin><basePath>app#pair=<enc(payload)>`
//   - the payload rides in the URL FRAGMENT (`#`), never a query param, so
//     the AES key is never sent to the server.
//   - parseInviteUrl extracts+decodes the `pair` fragment param; null on any
//     malformed / missing input; NEVER throws.
//   - normalizeScannedInput accepts a full URL or a bare payload; null on
//     junk; NEVER throws. It does NOT validate payload format.
//   - the build/parse round-trip is lossless for a real 32-byte key base64
//     whose alphabet includes `+`, `/`, `=`.

const ORIGIN = "https://example.com";
const BASE = "/lp9-beta/";

// -------------------------------------------------------------------------
// URL round-trip + key-in-fragment-not-query
// -------------------------------------------------------------------------

describe("PRD-24 QA: buildInviteUrl / parseInviteUrl round-trip", () => {
  it("round-trips a real 32-byte AES key base64 with + / = losslessly", () => {
    // Bytes chosen so btoa output includes +, /, and = padding.
    const bytes = new Uint8Array([
      251, 255, 62, 63, 254, 240, 15, 240, 255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    ]);
    const keyB64 = bytesToBase64(bytes);
    expect(keyB64).toMatch(/[+/=]/); // honesty: exercises the special chars
    const payload = buildInvitePayload("CODE-abc123", keyB64);

    const url = buildInviteUrl(payload, { origin: ORIGIN, basePath: BASE });
    const back = parseInviteUrl(url);

    expect(back).toBe(payload);
    // And the key survives verbatim inside the recovered payload.
    expect(back).toContain(keyB64);
  });

  it("fuzz: 500 random 32-byte keys round-trip through the URL losslessly", () => {
    for (let i = 0; i < 500; i++) {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      const keyB64 = bytesToBase64(bytes);
      const payload = buildInvitePayload(`code-${i}`, keyB64);
      const url = buildInviteUrl(payload, { origin: ORIGIN, basePath: BASE });
      expect(parseInviteUrl(url), `iter ${i} key=${keyB64}`).toBe(payload);
    }
  });

  it("survives a payload containing chars encodeURIComponent must escape", () => {
    // + / = & # ? space — a hostile-but-legal base64/code tail. The fragment
    // must not lose or mis-split any of them.
    const payload = "v1:CO DE&x=1#frag?q:AB+/cd==&more=%zz";
    const url = buildInviteUrl(payload, { origin: ORIGIN, basePath: BASE });
    expect(parseInviteUrl(url)).toBe(payload);
  });
});

describe("PRD-24 QA: the key rides in the FRAGMENT, never a query/path", () => {
  it("buildInviteUrl puts the payload after '#', and nothing sensitive before '?'/in the path", () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const keyB64 = bytesToBase64(bytes);
    const payload = buildInvitePayload("SECRETCODE", keyB64);
    const url = buildInviteUrl(payload, { origin: ORIGIN, basePath: BASE });

    const hashIndex = url.indexOf("#");
    expect(hashIndex).toBeGreaterThan(-1);

    const beforeHash = url.slice(0, hashIndex);
    const fragment = url.slice(hashIndex + 1);

    // No query string at all in the built URL.
    expect(beforeHash).not.toContain("?");
    // The key / code / payload must NOT appear before the '#'.
    expect(beforeHash).not.toContain(keyB64);
    expect(beforeHash).not.toContain("SECRETCODE");
    expect(beforeHash).not.toContain("pair=");
    // The path portion is just the app route under the base path.
    expect(beforeHash).toBe(`${ORIGIN}${BASE}app`);

    // The whole payload lives in the fragment under the `pair` key.
    expect(fragment.startsWith("pair=")).toBe(true);
    expect(decodeURIComponent(fragment.slice("pair=".length))).toBe(payload);
  });

  it("even a key with '=' does not leak into a query param position", () => {
    // '=' in the base64 tail must be percent-encoded so it can never be read
    // as a fragment-param separator or promoted to a query.
    const payload = "v1:C:AAAA===="; // trailing '=' padding
    const url = buildInviteUrl(payload, { origin: ORIGIN, basePath: BASE });
    expect(url).not.toContain("?");
    expect(url.slice(0, url.indexOf("#"))).not.toContain("=");
    expect(parseInviteUrl(url)).toBe(payload);
  });
});

// -------------------------------------------------------------------------
// parseInviteUrl edge cases (never throws)
// -------------------------------------------------------------------------

describe("PRD-24 QA: parseInviteUrl returns null / never throws on bad input", () => {
  const nullCases: Array<[string, unknown]> = [
    ["no fragment", "https://example.com/lp9-beta/app"],
    ["empty fragment (bare #)", "https://example.com/app#"],
    ["fragment without pair", "https://example.com/app#foo=bar"],
    ["empty pair value", "https://example.com/app#pair="],
    ["pair present but blank among others", "https://example.com/app#a=1&pair=&b=2"],
    ["junk after #", "https://example.com/app#%%%%"],
    ["not a url, no hash", "just some scanned text"],
    ["bare payload (no #)", "v1:CODE:AB+/cd=="],
    ["query param named pair (NOT a fragment)", "https://x/app?pair=v1:C:K"],
    ["malformed percent-encoding in pair", "https://x/app#pair=%zz"],
    ["malformed percent-encoding lone %", "https://x/app#pair=abc%"],
    ["double hash, pair only after 2nd (2nd is part of fragment)", "https://x/app##pair=x"],
    ["empty string", ""],
    ["only whitespace", "   "],
    ["non-string: null", null],
    ["non-string: undefined", undefined],
    ["non-string: number", 42],
    ["non-string: object", {}],
    ["non-string: array", []],
  ];

  it("never throws on any of the adversarial inputs", () => {
    for (const [label, input] of nullCases) {
      expect(
        () => parseInviteUrl(input as string),
        `input=${label}`,
      ).not.toThrow();
    }
  });

  it("returns null for every malformed/missing-pair input", () => {
    for (const [label, input] of nullCases) {
      expect(parseInviteUrl(input as string), `input=${label}`).toBeNull();
    }
  });

  it("extracts pair from a combined &-joined fragment (#a=1&pair=...)", () => {
    const payload = "v1:CODE:AB+/cd==";
    const enc = encodeURIComponent(payload);
    expect(parseInviteUrl(`https://x/app#a=1&pair=${enc}&b=2`)).toBe(payload);
    // Order-independent: pair first.
    expect(parseInviteUrl(`https://x/app#pair=${enc}&z=9`)).toBe(payload);
  });

  it("a double '#' with pair after the second still parses (fragment is everything after first #)", () => {
    // parseInviteUrl slices after the FIRST '#'; the second '#' becomes part
    // of the fragment. `#pair=...#extra` -> the fragment splits on '&', so a
    // pair value containing a raw '#' would include it. Assert no throw and a
    // deterministic result (documenting actual behavior, not a crash).
    const enc = encodeURIComponent("v1:C:K");
    expect(() =>
      parseInviteUrl(`https://x/app#pair=${enc}#trailing`),
    ).not.toThrow();
  });
});

// -------------------------------------------------------------------------
// normalizeScannedInput matrix (never throws)
// -------------------------------------------------------------------------

describe("PRD-24 QA: normalizeScannedInput matrix", () => {
  const payload = "v1:CODE:AB+/cd==";

  it("returns the bare payload from a full invite URL", () => {
    const url = buildInviteUrl(payload, { origin: ORIGIN, basePath: BASE });
    expect(normalizeScannedInput(url)).toBe(payload);
  });

  it("returns a bare v1:... payload unchanged (trimmed)", () => {
    expect(normalizeScannedInput(payload)).toBe(payload);
    expect(normalizeScannedInput(`\t  ${payload}  \n`)).toBe(payload);
  });

  it("returns the payload from a URL with extra fragment params", () => {
    const enc = encodeURIComponent(payload);
    expect(normalizeScannedInput(`https://x/app#a=1&pair=${enc}&b=2`)).toBe(
      payload,
    );
  });

  it("handles an oversized fragment without truncation or throw", () => {
    const bigKey = "A".repeat(50000);
    const big = `v1:CODE:${bigKey}`;
    const url = buildInviteUrl(big, { origin: ORIGIN, basePath: BASE });
    expect(normalizeScannedInput(url)).toBe(big);
  });

  const nullCases: Array<[string, unknown]> = [
    ["empty string", ""],
    ["whitespace only", "   \t\n"],
    ["url-shaped but missing pair", "https://x/app#foo=bar"],
    ["url with empty pair value", "https://x/app#pair="],
    ["has # but no usable pair", "text#garbage"],
    ["malformed percent-encoding in url", "https://x/app#pair=%zz"],
    ["non-string: null", null],
    ["non-string: undefined", undefined],
    ["non-string: number", 0],
    ["non-string: object", {}],
    ["non-string: array", []],
  ];

  it("returns null for every junk/empty/missing-pair input", () => {
    for (const [label, input] of nullCases) {
      expect(
        normalizeScannedInput(input as string),
        `input=${label}`,
      ).toBeNull();
    }
  });

  it("never throws on any adversarial input", () => {
    const inputs: unknown[] = [
      ...nullCases.map(([, v]) => v),
      payload,
      buildInviteUrl(payload, { origin: ORIGIN, basePath: BASE }),
      "v1:😀:🔑",
      "'; DROP TABLE relationships;--",
      "\u202Ereversed\u202C",
      Symbol("x"),
      () => {},
      42,
      NaN,
      true,
    ];
    for (const input of inputs) {
      expect(
        () => normalizeScannedInput(input as string),
        `input=${String(input)}`,
      ).not.toThrow();
    }
  });

  it("a bare payload with an embedded '#' is treated as a URL (not a payload) and rejected if no pair", () => {
    // A payload should never legitimately contain '#'. If one does, normalize
    // routes it through the URL branch; with no `pair=` it must return null,
    // never silently pass a corrupted payload downstream.
    expect(normalizeScannedInput("v1:CODE#:key==")).toBeNull();
  });
});
