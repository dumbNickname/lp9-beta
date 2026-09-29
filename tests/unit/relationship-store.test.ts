import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetMyRelationships = vi.fn();

vi.mock("~/lib/data/relationship", () => ({
  getMyRelationships: mockGetMyRelationships,
}));

describe("stores/relationship", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("refresh() sets the current-relationship signal from the active relationship", async () => {
    const rel = {
      id: "r1",
      member_a: "u1",
      member_b: "u2",
      archetype: "getting_to_know",
      status: "active",
      created_at: "2026-01-01",
      paired_at: "2026-01-01",
    };
    mockGetMyRelationships.mockResolvedValue([rel]);

    const store = await import("~/lib/stores/relationship");
    expect(store.relationship()).toBeNull();

    await store.refreshRelationship();

    expect(mockGetMyRelationships).toHaveBeenCalledTimes(1);
    expect(store.relationship()).toEqual(rel);
    expect(store.relationshipLoading()).toBe(false);
  });

  it("refresh() sets null when there is no active relationship", async () => {
    mockGetMyRelationships.mockResolvedValue([]);
    const store = await import("~/lib/stores/relationship");
    await store.refreshRelationship();
    expect(store.relationship()).toBeNull();
  });

  const mk = (id: string, status = "active") => ({
    id,
    member_a: "u1",
    member_b: `p-${id}`,
    archetype: "getting_to_know",
    status,
    created_at: "2026-01-01",
    paired_at: "2026-01-01",
  });

  it("pickRelationship: ?rel= > remembered > newest; ignores unknown ids", async () => {
    const { pickRelationship } = await import("~/lib/stores/relationship");
    const rels = [mk("new"), mk("old")] as never[];
    expect(pickRelationship(rels, "old", "new")!.id).toBe("old");
    expect(pickRelationship(rels, "nope", "old")!.id).toBe("old");
    expect(pickRelationship(rels, null, "nope")!.id).toBe("new");
    expect(pickRelationship([], "x", "y")).toBeNull();
  });

  it("filters archived, remembers selection, select + ?rel= sync with >1", async () => {
    localStorage.clear();
    history.replaceState(null, "", "/app");
    mockGetMyRelationships.mockResolvedValue([mk("r2"), mk("r1"), mk("gone", "archived")]);
    const store = await import("~/lib/stores/relationship");
    await store.refreshRelationship(true);
    expect(store.relationships().map((r) => r.id)).toEqual(["r2", "r1"]);
    expect(store.relationship()!.id).toBe("r2");
    store.selectRelationship("r1");
    expect(store.relationship()!.id).toBe("r1");
    expect(localStorage.getItem(store.ACTIVE_REL_KEY)).toBe("r1");
    expect(new URLSearchParams(location.search).get("rel")).toBe("r1");
    expect(location.pathname).toBe("/app");
    store.selectRelationship("not-mine");
    expect(store.relationship()!.id).toBe("r1");
  });

  it("?rel= in URL picks that relationship on load", async () => {
    localStorage.clear();
    history.replaceState(null, "", "/app?rel=r1");
    mockGetMyRelationships.mockResolvedValue([mk("r2"), mk("r1")]);
    const store = await import("~/lib/stores/relationship");
    await store.refreshRelationship(true);
    expect(store.relationship()!.id).toBe("r1");
    history.replaceState(null, "", "/");
  });
});
