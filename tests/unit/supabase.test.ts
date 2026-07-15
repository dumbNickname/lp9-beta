import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("supabase client module", () => {
  it("throws when VITE_SUPABASE_URL is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "fake-key");

    const mod = await import("~/lib/supabase");
    expect(() => mod.getSupabase()).toThrow("Missing VITE_SUPABASE_URL");
  });

  it("throws when VITE_SUPABASE_ANON_KEY is missing", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    const mod = await import("~/lib/supabase");
    expect(() => mod.getSupabase()).toThrow("Missing VITE_SUPABASE_ANON_KEY");
  });

  it("exports a supabase client when both env vars are set", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "fake-key");

    const mod = await import("~/lib/supabase");
    const client = mod.getSupabase();
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
