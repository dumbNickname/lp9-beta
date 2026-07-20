import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InviteQR from "~/components/InviteQR";
import { buildInvitePayload, buildInviteUrl } from "~/lib/pairing/qr";

// jsdom's <canvas> has no 2d context, so stub qrcode's canvas renderer.
vi.mock("qrcode", () => ({
  default: { toCanvas: vi.fn(() => Promise.resolve()) },
}));

const CODE = "ABCD1234";
const KEY_B64 = "a+/b==";

// jsdom's window.location.origin is "http://localhost:3000" by default;
// buildInviteUrl reads window.location.origin at runtime in the component.
const expectedUrl = () =>
  buildInviteUrl(buildInvitePayload(CODE, KEY_B64), {
    origin: window.location.origin,
  });

describe("InviteQR", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the QR canvas, the invite link field, and the short code", () => {
    const { getByLabelText, getByText, container } = render(() => (
      <InviteQR code={CODE} keyBase64={KEY_B64} />
    ));
    expect(container.querySelector("canvas")).toBeTruthy();
    expect(getByText(CODE)).toBeInTheDocument();
    const field = getByLabelText("Full invite link") as HTMLTextAreaElement;
    expect(field.value).toBe(expectedUrl());
  });

  it("copies the full invite URL to the clipboard and shows a Copied state", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });

    const { getByRole } = render(() => (
      <InviteQR code={CODE} keyBase64={KEY_B64} />
    ));

    const button = getByRole("button", { name: "Copy invite link" });
    fireEvent.click(button);

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText).toHaveBeenCalledWith(expectedUrl());

    await waitFor(() =>
      expect(
        getByRole("button", { name: "Copied" }),
      ).toBeInTheDocument(),
    );
  });

  it("falls back to selecting the field when clipboard is unavailable", async () => {
    Object.assign(navigator, { clipboard: undefined });

    const { getByRole, getByLabelText } = render(() => (
      <InviteQR code={CODE} keyBase64={KEY_B64} />
    ));
    const field = getByLabelText("Full invite link") as HTMLTextAreaElement;
    const selectSpy = vi.spyOn(field, "select");

    fireEvent.click(getByRole("button", { name: "Copy invite link" }));

    await waitFor(() =>
      expect(getByRole("button", { name: "Copied" })).toBeInTheDocument(),
    );
    expect(selectSpy).toHaveBeenCalled();
  });
});
