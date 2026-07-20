import { beforeEach, describe, expect, it, vi } from "vitest";

// QA adversarial suite for PRD-25 (D-25.2) — the peekPairCode DATA wrapper.
//
// This suite exercises the REAL ~/lib/data/relationship module against a
// mocked Supabase client, so it must NOT mock ~/lib/data/relationship.
//
// Contract under test:
//  - peekPairCode calls peek_pair_code with ONLY { p_code } — never a key.
//  - it takes data[0] (the RPC `returns table(...)`, surfaced as an array).
//  - it throws a friendly error on an empty result set (no silent undefined).
//  - it maps invalid/expired/consumed exceptions to friendly messages.
//  - no key material ever appears in the RPC args or the returned object,
//    even if a misbehaving RPC row carried one (the typed wrapper reads only
//    display_name + archetype).
//
// Whether the LIVE RPC leaves consumed_at NULL (truly does not consume) is an
// owner preview-branch check — no local Postgres in this env. Flagged in the
// PRD QA findings.

const mockRpc = vi.fn();

vi.mock("~/lib/supabase", () => ({
  supabase: { rpc: mockRpc },
  getSupabase: vi.fn(),
}));

// A key-shaped high-value string that must never cross the peek boundary.
const KEY_B64 = "AQIDBAUGBwgJCgsMDQ4PEA=="; // gitleaks:allow test fixture AES key (bytes 1..16)

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PRD-25 QA: peekPairCode never consumes and never carries a key", () => {
  it("sends ONLY { p_code } and returns data[0]; no key on the wire, single RPC", async () => {
    mockRpc.mockResolvedValue({
      data: [{ display_name: "Alex", archetype: "close_friends" }],
      error: null,
    });
    const { peekPairCode } = await import("~/lib/data/relationship");
    const peek = await peekPairCode("PEEKCODE");

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("peek_pair_code", { p_code: "PEEKCODE" });
    const arg = mockRpc.mock.calls[0]![1] as Record<string, unknown>;
    expect(Object.keys(arg)).toEqual(["p_code"]);
    expect(JSON.stringify(mockRpc.mock.calls[0])).not.toContain(KEY_B64);
    expect(peek).toEqual({ display_name: "Alex", archetype: "close_friends" });
  });

  it("normalizes a null display_name without throwing", async () => {
    mockRpc.mockResolvedValue({
      data: [{ display_name: null, archetype: "getting_to_know" }],
      error: null,
    });
    const { peekPairCode } = await import("~/lib/data/relationship");
    const peek = await peekPairCode("NULLNAME");
    expect(peek.display_name).toBeNull();
    expect(peek.archetype).toBe("getting_to_know");
  });

  it("does NOT leak key material even if the RPC row erroneously included one", async () => {
    mockRpc.mockResolvedValue({
      data: [{ display_name: "Alex", archetype: "close_friends", key: KEY_B64 }],
      error: null,
    });
    const { peekPairCode } = await import("~/lib/data/relationship");
    const peek = await peekPairCode("LEAKY");
    expect(JSON.stringify(peek)).not.toContain(KEY_B64);
    expect(Object.keys(peek).sort()).toEqual(["archetype", "display_name"]);
  });

  const errCases: Array<[string, RegExp]> = [
    ["invalid code", /not valid/i],
    ["code expired", /expired/i],
    ["code already used", /already been used/i],
  ];
  for (const [rpcMsg, expected] of errCases) {
    it(`maps "${rpcMsg}" to a friendly error`, async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error(rpcMsg) });
      const { peekPairCode } = await import("~/lib/data/relationship");
      await expect(peekPairCode("X")).rejects.toThrow(expected);
    });
  }

  it("throws a friendly error (not undefined) on an empty result set", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const { peekPairCode } = await import("~/lib/data/relationship");
    await expect(peekPairCode("X")).rejects.toThrow(/could not load/i);
  });

  it("an unknown RPC error falls back to a generic friendly message", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("boom 500") });
    const { peekPairCode } = await import("~/lib/data/relationship");
    await expect(peekPairCode("X")).rejects.toThrow(/could not load/i);
  });
});
