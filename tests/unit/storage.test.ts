import { afterEach, describe, expect, it, vi } from "vitest";
import { readJson, readLocal, removeLocal, removeLocalWhere, writeLocal } from "~/lib/storage";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("storage helpers", () => {
  it("round-trips, removes and parses JSON", () => {
    writeLocal("a", "1");
    expect(readLocal("a")).toBe("1");
    writeLocal("j", "[1]");
    expect(readJson<number[]>("j")).toEqual([1]);
    writeLocal("bad", "{");
    expect(readJson("bad")).toBeNull();
    removeLocal("a");
    expect(readLocal("a")).toBeNull();
  });

  it("removes only matching keys", () => {
    writeLocal("x:1", "1");
    writeLocal("x:2", "1");
    writeLocal("y", "1");
    removeLocalWhere((k) => k.startsWith("x:"));
    expect(localStorage.length).toBe(1);
  });

  it("swallows storage errors", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readLocal("a")).toBeNull();
    expect(() => writeLocal("a", "1")).not.toThrow();
  });
});
