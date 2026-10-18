import { afterEach, describe, expect, it, vi } from "vitest";

async function loadName() {
  vi.resetModules();
  return (await import("~/constants")).APP_NAME;
}

describe("APP_NAME per build (PRD-57, D-57.7)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses VITE_APP_NAME when the build sets it", async () => {
    vi.stubEnv("VITE_APP_NAME", "Endeary");
    expect(await loadName()).toBe("Endeary");
  });

  it("falls back to the working title when unset or empty", async () => {
    vi.stubEnv("VITE_APP_NAME", "");
    expect(await loadName()).toBe("lp9");
  });
});
