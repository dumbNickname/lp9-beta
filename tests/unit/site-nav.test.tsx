import { render } from "@solidjs/testing-library";
import { MemoryRouter, Route } from "@solidjs/router";
import { describe, expect, it } from "vitest";
import SiteNav from "~/components/SiteNav";

function renderNav(base = "") {
  return render(() => (
    <MemoryRouter base={base} root={SiteNav}>
      <Route path="*" component={() => null} />
    </MemoryRouter>
  ));
}

describe("SiteNav", () => {
  it("renders links to the four main pages", () => {
    const { getByRole } = renderNav();
    for (const name of ["Home", "App", "Privacy", "Terms"]) {
      expect(getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("prefixes hrefs with the router base (GitHub Pages sub-path)", () => {
    const { getByRole } = renderNav("/lp9-beta");
    expect(getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe(
      "/lp9-beta/privacy",
    );
    expect(getByRole("link", { name: "App" }).getAttribute("href")).toBe(
      "/lp9-beta/app",
    );
  });

  it("isCurrent: end-exact for home, prefix for others, trailing slash tolerant", async () => {
    const { isCurrent } = await import("~/components/SiteNav");
    expect(isCurrent("/lp9-beta/", "/lp9-beta", true)).toBe(true);
    expect(isCurrent("/lp9-beta/app/", "/lp9-beta", true)).toBe(false);
    expect(isCurrent("/lp9-beta/app/", "/lp9-beta/app")).toBe(true);
    expect(isCurrent("/lp9-beta", "/lp9-beta/app")).toBe(false);
    expect(isCurrent("/lp9-beta/application", "/lp9-beta/app")).toBe(false);
  });

  it("only the current page link has aria-current", () => {
    const { getByRole } = renderNav();
    const current = ["Home", "App", "Privacy", "Terms"].filter(
      (name) => getByRole("link", { name }).getAttribute("aria-current") === "page",
    );
    expect(current).toEqual(["Home"]);
  });
});

