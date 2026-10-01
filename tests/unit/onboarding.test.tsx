import { fireEvent, render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

const saveProfile = vi.fn<(arg: unknown) => Promise<void>>(() =>
  Promise.resolve(),
);
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
  it("renders a language select and archetype radio chips", async () => {
    const Onboarding = (await import("~/components/Onboarding")).default;
    const { getByLabelText, getByRole } = render(() => <Onboarding />);

    const locale = getByLabelText(/language/i) as HTMLSelectElement;
    expect(locale.tagName).toBe("SELECT");
    expect([...locale.options].map((o) => o.value)).toEqual(["en", "pl", "de"]);

    const group = getByRole("radiogroup", { name: /describes you best/i });
    const radios = [...group.querySelectorAll('[role="radio"]')];
    expect(radios.map((r) => r.textContent)).toEqual([
      "New together",
      "Long-term",
      "Close friends",
    ]);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
    fireEvent.click(radios[2]!);
    expect(radios[2]).toHaveAttribute("aria-checked", "true");
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
