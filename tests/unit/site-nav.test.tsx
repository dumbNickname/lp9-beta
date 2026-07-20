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
});
