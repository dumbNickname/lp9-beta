import { beforeEach, describe, expect, it, vi } from "vitest";

// Unit test for the PRD-25 peek data wrapper.
//
// `peekPairCode` calls the read-only `peek_pair_code` RPC with `{ p_code }`,
// returns the first row (the RPC `returns table(...)`, surfaced as an array),
// and maps the RPC exception messages to friendly, user-facing errors. It
// must never carry key material and must throw on an empty result.

const mockRpc = vi.fn();

vi.mock("~/lib/supabase", () => ({
  supabase: { rpc: mockRpc },
  getSupabase: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("peekPairCode", () => {
  it("calls peek_pair_code with { p_code } and returns the first row", async () => {
    mockRpc.mockResolvedValue({
      data: [{ display_name: "Alex", archetype: "close_friends" }],
      error: null,
    });
    const { peekPairCode } = await import("~/lib/data/relationship");
    const peek = await peekPairCode("CODE-1");

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("peek_pair_code", { p_code: "CODE-1" });
    // Arg object carries ONLY the code — never a key.
    const arg = mockRpc.mock.calls[0]![1] as Record<string, unknown>;
    expect(Object.keys(arg)).toEqual(["p_code"]);
    expect(peek).toEqual({ display_name: "Alex", archetype: "close_friends" });
  });

  it("normalizes a null display_name", async () => {
    mockRpc.mockResolvedValue({
      data: [{ display_name: null, archetype: "getting_to_know" }],
      error: null,
    });
    const { peekPairCode } = await import("~/lib/data/relationship");
    const peek = await peekPairCode("CODE-2");
    expect(peek.display_name).toBeNull();
    expect(peek.archetype).toBe("getting_to_know");
  });

  it("maps 'code expired' to a friendly error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("code expired") });
    const { peekPairCode } = await import("~/lib/data/relationship");
    await expect(peekPairCode("X")).rejects.toThrow(/expired/i);
  });

  it("maps 'invalid code' to a friendly error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("invalid code") });
    const { peekPairCode } = await import("~/lib/data/relationship");
    await expect(peekPairCode("X")).rejects.toThrow(/not valid/i);
  });

  it("maps 'code already used' to a friendly error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: new Error("code already used"),
    });
    const { peekPairCode } = await import("~/lib/data/relationship");
    await expect(peekPairCode("X")).rejects.toThrow(/already been used/i);
  });

  it("throws when the RPC returns an empty result set", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    const { peekPairCode } = await import("~/lib/data/relationship");
    await expect(peekPairCode("X")).rejects.toThrow(/could not load/i);
  });
});
