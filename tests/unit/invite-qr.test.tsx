import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import InviteQR from "~/components/InviteQR";

// jsdom's <canvas> has no 2d context, so stub qrcode's canvas renderer.
vi.mock("qrcode", () => ({
  default: { toCanvas: vi.fn(() => Promise.resolve()) },
}));

describe("InviteQR", () => {
  it("renders without error and shows the manual code", () => {
    const { getByText, container } = render(() => (
      <InviteQR payload="v1:ABCD1234:a+/b==" code="ABCD1234" />
    ));
    expect(getByText("ABCD1234")).toBeInTheDocument();
    expect(container.querySelector("canvas")).toBeTruthy();
  });
});
