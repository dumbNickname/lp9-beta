import { describe, expect, it, vi } from "vitest";

vi.mock("~/lib/crypto/keystore", () => ({ clearKeys: vi.fn() }));
vi.mock("~/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.reject(new Error("offline"))),
      signInAnonymously: vi.fn(),
    },
  },
}));

describe("initSession", () => {
  it("clears loading even when getSession throws", async () => {
    const { initSession, loading } = await import("~/lib/session");
    expect(loading()).toBe(true);
    await expect(initSession()).rejects.toThrow("offline");
    expect(loading()).toBe(false);
  });
});
