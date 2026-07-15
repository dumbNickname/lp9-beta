import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSingle = vi.fn();
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockUpdate = vi.fn(() => ({ select: mockSelect }));
const mockFrom = vi.fn(() => ({ select: mockSelect, update: mockUpdate }));

vi.mock("~/lib/supabase", () => ({
  supabase: { from: mockFrom },
  getSupabase: vi.fn(),
}));

describe("data/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ single: mockSingle });
    mockUpdate.mockReturnValue({ select: mockSelect });
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });
  });

  it("getMyProfile returns profile on success", async () => {
    const row = { id: "u1", display_name: "Alice", locale: "en", theme: "system", created_at: "2026-01-01" };
    mockSingle.mockResolvedValue({ data: row, error: null });

    const { getMyProfile } = await import("~/lib/data/profile");
    const result = await getMyProfile();

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(result).toEqual(row);
  });

  it("getMyProfile returns null on PGRST116 (no row)", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116", message: "no rows" } });

    const { getMyProfile } = await import("~/lib/data/profile");
    const result = await getMyProfile();
    expect(result).toBeNull();
  });

  it("getMyProfile throws on other errors", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: "42501", message: "denied" } });

    const { getMyProfile } = await import("~/lib/data/profile");
    await expect(getMyProfile()).rejects.toEqual({ code: "42501", message: "denied" });
  });

  it("updateMyProfile calls update with patch and returns data", async () => {
    const updated = { id: "u1", display_name: "Bob", locale: "en", theme: "dark", created_at: "2026-01-01" };
    mockSingle.mockResolvedValue({ data: updated, error: null });

    const { updateMyProfile } = await import("~/lib/data/profile");
    const result = await updateMyProfile({ display_name: "Bob" });

    expect(mockUpdate).toHaveBeenCalledWith({ display_name: "Bob" });
    expect(result).toEqual(updated);
  });
});
