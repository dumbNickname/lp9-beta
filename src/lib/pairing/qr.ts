// Invite payload: compact, versioned, delimited string.
// Format: `v1:<code>:<keyBase64>`
//
// keyBase64 uses the standard base64 alphabet (see `bytesToBase64` in
// `~/lib/crypto/aes`), so it may contain `+`, `/`, and `=` but never `:`.
// That makes splitting on the FIRST TWO colons unambiguous: everything
// after the second colon is the key, verbatim.

const VERSION = "v1";

export function buildInvitePayload(code: string, keyBase64: string): string {
  return `${VERSION}:${code}:${keyBase64}`;
}

export function parseInvitePayload(
  payload: string,
): { code: string; keyBase64: string } | null {
  if (typeof payload !== "string") return null;

  const firstColon = payload.indexOf(":");
  if (firstColon === -1) return null;

  const secondColon = payload.indexOf(":", firstColon + 1);
  if (secondColon === -1) return null;

  const version = payload.slice(0, firstColon);
  const code = payload.slice(firstColon + 1, secondColon);
  const keyBase64 = payload.slice(secondColon + 1);

  if (version !== VERSION) return null;
  if (code.length === 0) return null;
  if (keyBase64.length === 0) return null;

  return { code, keyBase64 };
}

// --- Deep-link invite URL (PRD-24, D-24.1) --------------------------------
//
// The QR encodes an app deep link so iOS native Camera recognizes it as a
// URL and opens the app. Shape: `<origin><basePath>app#pair=<payload>`.
//
// The payload rides in the URL FRAGMENT (`#`), never a query param, so the
// AES key is never transmitted to the server (browsers do not send the
// fragment in the request line).
//
// Encoding: the payload is `v1:<code>:<base64>` whose base64 tail may hold
// `+`, `/`, `=`. In a fragment `+` can be read as a space and `/`, `=` are
// ambiguous once other params appear, so we `encodeURIComponent()` the
// payload when building and `decodeURIComponent()` when parsing. That makes
// the round-trip lossless regardless of the base64 characters.
const FRAGMENT_KEY = "pair";

// Normalize a base path to exactly one leading and one trailing slash,
// e.g. "" -> "/", "/lp9-beta" -> "/lp9-beta/", "/lp9-beta/" -> "/lp9-beta/".
function normalizeBasePath(basePath: string): string {
  const trimmed = basePath.replace(/^\/+|\/+$/g, "");
  return trimmed.length === 0 ? "/" : `/${trimmed}/`;
}

function defaultOrigin(): string {
  if (typeof window !== "undefined" && window.location) {
    return window.location.origin;
  }
  return "";
}

function defaultBasePath(): string {
  // SERVER_BASE_URL is a Vite compile-time replacement (see src/app.tsx). It
  // may be undefined during prerender in a separate Node process; guard it.
  try {
    return import.meta.env.SERVER_BASE_URL || "/";
  } catch {
    return "/";
  }
}

// Build the deep-link invite URL that the QR encodes and the copy field
// shows. In the browser the caller should pass `window.location.origin`;
// with no origin available the result is a base-path-relative URL.
export function buildInviteUrl(
  payload: string,
  opts?: { origin?: string; basePath?: string },
): string {
  const origin = (opts?.origin ?? defaultOrigin()).replace(/\/$/, "");
  const base = normalizeBasePath(opts?.basePath ?? defaultBasePath());
  const fragment = `${FRAGMENT_KEY}=${encodeURIComponent(payload)}`;
  return `${origin}${base}app#${fragment}`;
}

// Extract the raw payload from an invite URL's `#pair=` fragment. Accepts a
// fragment with a single `pair` param or combined `&`-joined fragment params
// (`#a=1&pair=...`). Returns the decoded payload, or null if there is no
// fragment / no `pair` key / it is malformed. Never throws.
export function parseInviteUrl(url: string): string | null {
  if (typeof url !== "string") return null;
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return null;
  const fragment = url.slice(hashIndex + 1);
  if (fragment.length === 0) return null;

  for (const part of fragment.split("&")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    if (key !== FRAGMENT_KEY) continue;
    const rawValue = part.slice(eq + 1);
    if (rawValue.length === 0) return null;
    try {
      return decodeURIComponent(rawValue);
    } catch {
      // Malformed percent-encoding.
      return null;
    }
  }
  return null;
}

// Accept EITHER a full invite URL (with a `#pair=` fragment) OR a bare
// `v1:...` payload, and return a bare payload string suitable for
// `parseInvitePayload`. Returns null if nothing usable is found. Never
// throws. This is the single entry point for both the scanner decode path
// and the manual paste box.
export function normalizeScannedInput(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  // A URL form always carries a fragment; prefer extracting from it.
  if (trimmed.includes("#")) {
    const fromUrl = parseInviteUrl(trimmed);
    if (fromUrl !== null) return fromUrl;
    // Had a `#` but no usable `pair=` — not a valid invite URL.
    return null;
  }

  // Otherwise treat it as a bare payload.
  return trimmed;
}
