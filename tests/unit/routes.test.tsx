import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { APP_NAME } from "~/constants";
import Home from "~/routes/index";
import Privacy from "~/routes/privacy";
import Terms from "~/routes/terms";

vi.mock("~/lib/supabase", () => ({
  supabase: { from: vi.fn() },
  getSupabase: vi.fn(),
}));

vi.mock("~/lib/session", () => ({
  loading: () => false,
  user: () => null,
  session: () => null,
}));

vi.mock("~/lib/stores/profile", () => ({
  profile: () => null,
  profileLoading: () => false,
  refreshProfile: vi.fn(),
  useProfileFocusRefresh: vi.fn(),
}));

describe("route smoke tests", () => {
  it("renders the home route with APP_NAME", () => {
    const { getByRole } = render(() => <Home />);
    expect(getByRole("heading", { level: 1 }).textContent).toContain(APP_NAME);
  });

  it("renders the privacy route", () => {
    const { getByRole } = render(() => <Privacy />);
    expect(getByRole("heading", { level: 1 }).textContent).toContain(APP_NAME);
  });

  it("renders the terms route", () => {
    const { getByRole } = render(() => <Terms />);
    expect(getByRole("heading", { level: 1 }).textContent).toContain(APP_NAME);
  });

  it("renders the app shell route with APP_NAME", async () => {
    const AppShell = (await import("~/routes/app")).default;
    const { getByRole } = render(() => <AppShell />);
    expect(getByRole("heading", { level: 1 }).textContent).toContain(APP_NAME);
  });
});
