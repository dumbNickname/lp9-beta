import { describe, expect, it } from "vitest";
import {
  nextChoice,
  normalizeChoice,
  resolveEffectiveTheme,
} from "~/lib/theme";

describe("normalizeChoice", () => {
  it("passes through valid choices", () => {
    expect(normalizeChoice("light")).toBe("light");
    expect(normalizeChoice("dark")).toBe("dark");
    expect(normalizeChoice("system")).toBe("system");
  });

  it("falls back to system for garbage / null", () => {
    expect(normalizeChoice("purple")).toBe("system");
    expect(normalizeChoice(null)).toBe("system");
    expect(normalizeChoice(undefined)).toBe("system");
    expect(normalizeChoice(42)).toBe("system");
  });
});

describe("resolveEffectiveTheme", () => {
  it("returns the explicit choice for light/dark regardless of system", () => {
    expect(resolveEffectiveTheme("light", true)).toBe("light");
    expect(resolveEffectiveTheme("dark", false)).toBe("dark");
  });

  it("follows system preference in system mode", () => {
    expect(resolveEffectiveTheme("system", true)).toBe("dark");
    expect(resolveEffectiveTheme("system", false)).toBe("light");
  });
});

describe("nextChoice", () => {
  it("cycles light -> dark -> system -> light", () => {
    expect(nextChoice("light")).toBe("dark");
    expect(nextChoice("dark")).toBe("system");
    expect(nextChoice("system")).toBe("light");
  });
});
