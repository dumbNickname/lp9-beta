import { beforeEach, describe, expect, it, vi } from "vitest";

// Invite-link regression (WORKLOG T1): the `#pair=` payload must survive
// onboarding and any remount, and store refreshes after the first load must
// not flip the loading gate (which unmounted the app shell).

const mockGetMyRelationships = vi.fn();
const mockGetMyProfile = vi.fn();
vi.mock("~/lib/data/relationship", () => ({ getMyRelationships: mockGetMyRelationships }));
vi.mock("~/lib/data/profile", () => ({ getMyProfile: mockGetMyProfile, updateMyProfile: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  window.history.replaceState(null, "", "/app");
});

describe("pendingJoin", () => {
  it("captures the payload once, strips the fragment, keeps it in memory", async () => {
    const m = await import("~/lib/pairing/pendingJoin");
    window.history.replaceState(null, "", "/app#pair=v1%3AABC%3Akey");
    expect(m.captureInviteFromUrl()).toBe("v1:ABC:key");
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/app");
    // A later capture (remounted PairFlow) still sees it.
    expect(m.captureInviteFromUrl()).toBe("v1:ABC:key");
    expect(m.pendingJoin()).toBe("v1:ABC:key");
    m.clearPendingJoin();
    expect(m.captureInviteFromUrl()).toBeNull();
  });

  it("never writes the payload to storage", async () => {
    localStorage.clear();
    const m = await import("~/lib/pairing/pendingJoin");
    window.history.replaceState(null, "", "/app#pair=v1%3AABC%3Akey");
    m.captureInviteFromUrl();
    expect(JSON.stringify({ ...localStorage })).not.toContain("ABC");
  });
});

describe("loading gate only on first load", () => {
  it("relationship refresh after the first does not set loading", async () => {
    mockGetMyRelationships.mockResolvedValue([]);
    const store = await import("~/lib/stores/relationship");
    const seen: boolean[] = [];
    const first = store.refreshRelationship(true);
    seen.push(store.relationshipLoading());
    await first;
    const second = store.refreshRelationship(true);
    seen.push(store.relationshipLoading());
    await second;
    expect(seen).toEqual([true, false]);
  });

  it("profile refresh after the first does not set loading", async () => {
    vi.useFakeTimers();
    mockGetMyProfile.mockResolvedValue({ id: "u1", display_name: "A" });
    const store = await import("~/lib/stores/profile");
    const first = store.refreshProfile();
    expect(store.profileLoading()).toBe(true);
    await first;
    vi.advanceTimersByTime(5000);
    const second = store.refreshProfile();
    expect(store.profileLoading()).toBe(false);
    await second;
    vi.useRealTimers();
  });
});
