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
