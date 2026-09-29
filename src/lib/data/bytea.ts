// PostgREST serializes `bytea` as a hex string prefixed with `\x`
// (Postgres default `bytea_output = hex`). These helpers convert between
// that wire form and Uint8Array. On input to an RPC bytea parameter,
// PostgREST accepts the same `\x`-prefixed hex text.
export function bytesToBytea(bytes: Uint8Array): string {
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return `\\x${hex}`;
}

export function byteaToBytes(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (Array.isArray(value)) return Uint8Array.from(value as number[]);
  if (typeof value !== "string") {
    throw new Error("unexpected bytea encoding");
  }
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
