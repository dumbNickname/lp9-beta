import { beforeEach, describe, expect, it, vi } from "vitest";

const mockListCoupons = vi.fn();
const mockListClaims = vi.fn();

vi.mock("~/lib/data/coupons", () => ({ listCoupons: mockListCoupons }));
vi.mock("~/lib/data/claims", () => ({
  listClaims: mockListClaims,
  sweepExpiredClaims: vi.fn(() => Promise.resolve(0)),
}));

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("stores stale-response guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("coupons: older response resolving last does not overwrite newer data", async () => {
    const older = deferred<unknown[]>();
    const newer = deferred<unknown[]>();
    mockListCoupons.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    const store = await import("~/lib/stores/coupons");
    const a = store.refreshCoupons("r1");
    const b = store.refreshCoupons("r1");
    newer.resolve([{ id: "new" }]);
    await b;
    expect(store.couponsLoading()).toBe(false);
    older.resolve([{ id: "old" }]);
    await a;
    expect(store.coupons()).toEqual([{ id: "new" }]);
  });

  it("coupons: stale failure does not set the error flag", async () => {
    const older = deferred<unknown[]>();
    mockListCoupons.mockReturnValueOnce(older.promise).mockResolvedValueOnce([{ id: "ok" }]);
    const store = await import("~/lib/stores/coupons");
    const a = store.refreshCoupons("r1");
    await store.refreshCoupons("r1");
    older.reject(new Error("boom"));
    await a;
    expect(store.couponsError()).toBe(false);
    expect(store.coupons()).toEqual([{ id: "ok" }]);
  });

  it("claims: reset drops in-flight responses and clears error", async () => {
    const pending = deferred<unknown[]>();
    mockListClaims.mockRejectedValueOnce(new Error("x")).mockReturnValueOnce(pending.promise);
    const store = await import("~/lib/stores/claims");
    await store.refreshClaims("r1");
    expect(store.claimsError()).toBe(true);
    const p = store.refreshClaims("r1");
    store.resetClaims();
    expect(store.claimsError()).toBe(false);
    pending.resolve([{ id: "late" }]);
    await p;
    expect(store.claims()).toEqual([]);
  });
});
