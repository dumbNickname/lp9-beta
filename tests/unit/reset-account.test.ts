import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const clearKeys = vi.fn(() => Promise.resolve());
const signOut = vi.fn(() => Promise.resolve({ error: null }));

vi.mock("~/lib/crypto/keystore", () => ({
  clearKeys: () => clearKeys(),
}));

vi.mock("~/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      signInAnonymously: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: () => signOut(),
    },
  },
}));

beforeEach(() => {
  localStorage.clear();
  clearKeys.mockClear();
  signOut.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resetAccount", () => {
  it("clears keys, pairing/recovery localStorage markers, and signs out", async () => {
    localStorage.setItem("pair_invite_pending", "x");
    localStorage.setItem("archetype_hint", "close_friends");
    localStorage.setItem("recovery_prompted:r1", "1");
    localStorage.setItem("theme", "dark"); // unrelated — must survive

    const { resetAccount } = await import("~/lib/session");
    await resetAccount();

    expect(clearKeys).toHaveBeenCalledOnce();
    expect(signOut).toHaveBeenCalledOnce();
    expect(localStorage.getItem("pair_invite_pending")).toBeNull();
    expect(localStorage.getItem("archetype_hint")).toBeNull();
    expect(localStorage.getItem("recovery_prompted:r1")).toBeNull();
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
