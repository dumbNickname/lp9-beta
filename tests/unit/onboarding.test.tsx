import { fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

const saveProfile = vi.fn((_arg: unknown) => Promise.resolve());
const refreshProfile = vi.fn(() => Promise.resolve());

vi.mock("~/lib/stores/profile", () => ({
  saveProfile: (arg: unknown) => saveProfile(arg),
  refreshProfile: () => refreshProfile(),
}));

afterEach(() => {
  saveProfile.mockClear();
  refreshProfile.mockClear();
  vi.restoreAllMocks();
});

describe("Onboarding selectors", () => {
  it("renders <select> dropdowns for language and archetype with the allowed options", async () => {
    const Onboarding = (await import("~/components/Onboarding")).default;
    const { getByLabelText } = render(() => <Onboarding />);

    const locale = getByLabelText(/language/i) as HTMLSelectElement;
    const archetype = getByLabelText(/describes you best/i) as HTMLSelectElement;

    expect(locale.tagName).toBe("SELECT");
    expect(archetype.tagName).toBe("SELECT");
    expect([...locale.options].map((o) => o.value)).toEqual(["en", "pl", "de"]);
    expect([...archetype.options].map((o) => o.value)).toEqual([
      "getting_to_know",
      "established_couple",
      "close_friends",
    ]);
  });

  it("submits the selected locale", async () => {
    const Onboarding = (await import("~/components/Onboarding")).default;
    const { getByLabelText, getByRole } = render(() => <Onboarding />);

    fireEvent.input(getByLabelText(/display name/i), {
      target: { value: "Alice" },
    });
    const locale = getByLabelText(/language/i) as HTMLSelectElement;
    fireEvent.change(locale, { target: { value: "pl" } });

    fireEvent.click(getByRole("button", { name: /continue/i }));
    await Promise.resolve();

    expect(saveProfile).toHaveBeenCalledWith({
      display_name: "Alice",
      locale: "pl",
    });
  });
});
