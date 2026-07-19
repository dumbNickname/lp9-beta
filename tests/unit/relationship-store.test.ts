import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGetMyActiveRelationship = vi.fn();

vi.mock("~/lib/data/relationship", () => ({
  getMyActiveRelationship: mockGetMyActiveRelationship,
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
    mockGetMyActiveRelationship.mockResolvedValue(rel);

    const store = await import("~/lib/stores/relationship");
    expect(store.relationship()).toBeNull();

    await store.refreshRelationship();

    expect(mockGetMyActiveRelationship).toHaveBeenCalledTimes(1);
    expect(store.relationship()).toEqual(rel);
    expect(store.relationshipLoading()).toBe(false);
  });

  it("refresh() sets null when there is no active relationship", async () => {
    mockGetMyActiveRelationship.mockResolvedValue(null);
    const store = await import("~/lib/stores/relationship");
    await store.refreshRelationship();
    expect(store.relationship()).toBeNull();
  });
});
