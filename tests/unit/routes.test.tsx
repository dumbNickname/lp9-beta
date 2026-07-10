import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { APP_NAME } from "~/constants";
import Home from "~/routes/index";
import Privacy from "~/routes/privacy";
import Terms from "~/routes/terms";
import AppShell from "~/routes/app";

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

  it("renders the app shell route", () => {
    const { getByRole } = render(() => <AppShell />);
    expect(getByRole("heading", { level: 1 }).textContent).toContain(APP_NAME);
  });
});
