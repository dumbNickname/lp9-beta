import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

const saveProfile = vi.fn<(p: unknown) => Promise<void>>(() => Promise.resolve());

vi.mock("~/lib/stores/profile", () => ({
  saveProfile: (p: unknown) => saveProfile(p),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PairBadge", () => {
  it("shows both names and initials", async () => {
    const PairBadge = (await import("~/components/PairBadge")).default;
    const { getByText, container } = render(() => (
      <PairBadge myName="test1" partnerName="Bob" />
    ));
    expect(getByText(/test1/)).toBeInTheDocument();
    expect(getByText(/Bob/)).toBeInTheDocument();
    const avatars = container.querySelectorAll(".avatar");
    expect(avatars[0]!.textContent).toBe("T");
    expect(avatars[1]!.textContent).toBe("B");
  });

  it("falls back when partner name unknown", async () => {
    const PairBadge = (await import("~/components/PairBadge")).default;
    const { getByText } = render(() => <PairBadge myName="Anna" partnerName={null} />);
    expect(getByText(/your partner/)).toBeInTheDocument();
  });

  it("edits own display name (trimmed)", async () => {
    const PairBadge = (await import("~/components/PairBadge")).default;
    const { getByRole } = render(() => <PairBadge myName="test1" partnerName="Bob" />);
    fireEvent.click(getByRole("button", { name: /edit my name/i }));
    const input = getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("test1");
    expect(input.maxLength).toBe(50);
    fireEvent.input(input, { target: { value: "  Anna  " } });
    fireEvent.click(getByRole("button", { name: "Save" }));
    await waitFor(() => expect(saveProfile).toHaveBeenCalledWith({ display_name: "Anna" }));
  });

  it("rejects an empty name", async () => {
    const PairBadge = (await import("~/components/PairBadge")).default;
    const { getByRole } = render(() => <PairBadge myName="test1" partnerName="Bob" />);
    fireEvent.click(getByRole("button", { name: /edit my name/i }));
    fireEvent.input(getByRole("textbox"), { target: { value: "   " } });
    fireEvent.click(getByRole("button", { name: "Save" }));
    expect(getByRole("alert")).toHaveTextContent(/can't be empty/);
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it("initial() handles emoji and empty", async () => {
    const { initial } = await import("~/components/PairBadge");
    expect(initial("")).toBe("?");
    expect(initial("émile")).toBe("É");
  });
});
