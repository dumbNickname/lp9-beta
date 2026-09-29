import { describe, expect, it } from "vitest";
import { byteaToBytes, bytesToBytea } from "~/lib/data/bytea";

describe("bytea helpers", () => {
  it("encodes bytes as \\x-prefixed lowercase hex", () => {
    expect(bytesToBytea(new Uint8Array([0, 1, 250, 255]))).toBe("\\x0001faff");
  });

  it("round-trips arbitrary bytes", () => {
    const bytes = crypto.getRandomValues(new Uint8Array(64));
    expect(Array.from(byteaToBytes(bytesToBytea(bytes)))).toEqual(Array.from(bytes));
  });

  it("accepts Uint8Array and number arrays", () => {
    expect(Array.from(byteaToBytes(new Uint8Array([7])))).toEqual([7]);
    expect(Array.from(byteaToBytes([1, 2]))).toEqual([1, 2]);
  });

  it("throws on unexpected shapes", () => {
    expect(() => byteaToBytes(42)).toThrow();
  });
});
