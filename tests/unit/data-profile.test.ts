import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ single: mockSingle, select: vi.fn(() => ({ single: mockSingle })) }));
const mockSelect = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
const mockUpdate = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }));
const mockGetUser = vi.fn();

vi.mock("~/lib/supabase", () => ({
  supabase: {
    from: mockFrom,
    auth: { getUser: mockGetUser },
  },
  getSupabase: vi.fn(),
}));

describe("data/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
    mockEq.mockReturnValue({ single: mockSingle, select: vi.fn(() => ({ single: mockSingle })) });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });
  });

  it("getMyProfile returns profile on success", async () => {
    const row = { id: "u1", display_name: "Alice", locale: "en", theme: "system", created_at: "2026-01-01" };
    mockSingle.mockResolvedValue({ data: row, error: null });

    const { getMyProfile } = await import("~/lib/data/profile");
    const result = await getMyProfile();

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockEq).toHaveBeenCalledWith("id", "u1");
    expect(result).toEqual(row);
  });

  it("getMyProfile returns null on PGRST116 (no row)", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116", message: "no rows" } });

    const { getMyProfile } = await import("~/lib/data/profile");
    const result = await getMyProfile();
    expect(result).toBeNull();
  });

  it("getMyProfile returns null when no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { getMyProfile } = await import("~/lib/data/profile");
    const result = await getMyProfile();
    expect(result).toBeNull();
  });

  it("updateMyProfile calls update with eq filter and returns data", async () => {
    const updated = { id: "u1", display_name: "Bob", locale: "en", theme: "dark", created_at: "2026-01-01" };
    mockSingle.mockResolvedValue({ data: updated, error: null });

    const { updateMyProfile } = await import("~/lib/data/profile");
    const result = await updateMyProfile({ display_name: "Bob" });

    expect(mockUpdate).toHaveBeenCalledWith({ display_name: "Bob" });
    expect(mockEq).toHaveBeenCalledWith("id", "u1");
    expect(result).toEqual(updated);
  });
});
