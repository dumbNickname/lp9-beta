import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import Callout from "~/components/Callout";

describe("Callout", () => {
  it("renders its children", () => {
    const { getByText } = render(() => <Callout>Hello there</Callout>);
    expect(getByText("Hello there")).toBeInTheDocument();
  });

  it("defaults to the warning variant class", () => {
    const { getByRole } = render(() => <Callout>body</Callout>);
    expect(getByRole("note")).toHaveClass("callout--warning");
  });

  it("applies the info variant class when requested", () => {
    const { getByRole } = render(() => <Callout variant="info">body</Callout>);
    expect(getByRole("note")).toHaveClass("callout--info");
  });

  it("renders an optional title", () => {
    const { getByText } = render(() => (
      <Callout title="Heading">body</Callout>
    ));
    expect(getByText("Heading")).toBeInTheDocument();
  });

  it("uses role=note (non-blocking, not an alert)", () => {
    const { getByRole, queryByRole } = render(() => <Callout>x</Callout>);
    expect(getByRole("note")).toBeInTheDocument();
    expect(queryByRole("alert")).toBeNull();
  });
});
