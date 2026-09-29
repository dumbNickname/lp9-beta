import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRpc = vi.fn();
const chain: Record<string, ReturnType<typeof vi.fn>> = {};
const mockFrom = vi.fn(() => chain);

vi.mock("~/lib/supabase", () => ({
  supabase: { from: mockFrom, rpc: mockRpc, auth: { getUser: vi.fn() } },
  getSupabase: vi.fn(),
}));

function resetChain(result: unknown) {
  for (const k of ["select", "eq", "order"]) chain[k] = vi.fn(() => chain);
  chain.limit = vi.fn(() => Promise.resolve(result));
  // listReceivedAmounts awaits the chain after the last eq.
  (chain as unknown as { then: unknown }).then = (
    resolve: (v: unknown) => void,
  ) => resolve(result);
}

describe("data/points", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: "p-1", error: null });
  });

  it("listPoints filters by relationship, orders newest first, decodes bytea", async () => {
    resetChain({
      data: [
        {
          id: "p1",
          relationship_id: "r1",
          giver_id: "a",
          receiver_id: "b",
          amount: 3,
          comment_ciphertext: "\\x0a0b",
          comment_iv: "\\x000102030405060708090a0b",
          edited_at: null,
          event_date: "2026-09-29",
          created_at: "2026-09-29T10:00:00Z",
        },
        {
          id: "p2",
          relationship_id: "r1",
          giver_id: "b",
          receiver_id: "a",
          amount: 1,
          comment_ciphertext: null,
          comment_iv: null,
          edited_at: null,
          event_date: "2026-09-28",
          created_at: "2026-09-28T10:00:00Z",
        },
      ],
      error: null,
    });
    const { listPoints } = await import("~/lib/data/points");
    const rows = await listPoints("r1");
    expect(mockFrom).toHaveBeenCalledWith("points");
    expect(chain.eq).toHaveBeenCalledWith("relationship_id", "r1");
    expect(chain.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(chain.limit).toHaveBeenCalledWith(50);
    expect(Array.from(rows[0]!.comment_ciphertext!)).toEqual([10, 11]);
    expect(rows[0]!.comment_iv!.length).toBe(12);
    expect(rows[1]!.comment_ciphertext).toBeNull();
  });

  it("listReceivedAmounts filters by relationship and receiver", async () => {
    resetChain({ data: [{ amount: 2 }, { amount: 5 }], error: null });
    const { listReceivedAmounts } = await import("~/lib/data/points");
    expect(await listReceivedAmounts("r1", "me")).toEqual([2, 5]);
    expect(chain.eq).toHaveBeenCalledWith("relationship_id", "r1");
    expect(chain.eq).toHaveBeenCalledWith("receiver_id", "me");
  });

  it("givePoints sends hex bytea and never plaintext", async () => {
    const { givePoints } = await import("~/lib/data/points");
    const id = await givePoints(
      "r1",
      4,
      { ciphertext: new Uint8Array([1, 2]), iv: new Uint8Array(12) },
      "2026-09-29",
    );
    expect(id).toBe("p-1");
    expect(mockRpc).toHaveBeenCalledWith("give_points", {
      p_rel_id: "r1",
      p_amount: 4,
      p_ciphertext: "\\x0102",
      p_iv: "\\x" + "00".repeat(12),
      p_event_date: "2026-09-29",
    });
  });

  it("givePoints without comment sends nulls", async () => {
    const { givePoints } = await import("~/lib/data/points");
    await givePoints("r1", 1, null, "2026-09-29");
    expect(mockRpc).toHaveBeenCalledWith(
      "give_points",
      expect.objectContaining({ p_ciphertext: null, p_iv: null }),
    );
  });

  it("editPointComment and deletePoint call their RPCs", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const { editPointComment, deletePoint } = await import("~/lib/data/points");
    await editPointComment("p1", null);
    expect(mockRpc).toHaveBeenCalledWith("edit_point_comment", {
      p_point_id: "p1",
      p_ciphertext: null,
      p_iv: null,
    });
    await deletePoint("p1");
    expect(mockRpc).toHaveBeenCalledWith("delete_point", { p_point_id: "p1" });
  });

  it("RPC errors propagate", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "delete window closed" } });
    const { deletePoint } = await import("~/lib/data/points");
    await expect(deletePoint("p1")).rejects.toMatchObject({ message: "delete window closed" });
  });

  it("friendlyPointsError maps known messages", async () => {
    const { friendlyPointsError } = await import("~/lib/data/points");
    expect(friendlyPointsError({ message: "edit window closed" })).toMatch(/24 hours/);
    expect(friendlyPointsError(new Error("invalid event date"))).toMatch(/30 days/);
    expect(friendlyPointsError("weird")).toMatch(/Something went wrong/);
  });
});
