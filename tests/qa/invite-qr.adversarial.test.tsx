import { fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InviteQR from "~/components/InviteQR";
import { buildInvitePayload, buildInviteUrl, parseInviteUrl } from "~/lib/pairing/qr";

// QA adversarial suite for PRD-24 — InviteQR copy button.
// Reconciled for PRD-25 (D-25.3): the standalone actionable short code is
// REMOVED from the invite UI. QR + copyable invite link are the only
// shareables. The copy-full-URL invariant is unchanged.
//
// Contract (PRD-24 + PRD-25 D-25.3):
//   - the Copy button copies the FULL invite URL (deep link), NOT the short
//     8-char code — pasting the short code was the original dead-end bug.
//   - when navigator.clipboard.writeText REJECTS (blocked / insecure
//     context), the component must NOT crash and must still surface the full
//     invite text for manual copy (select the field).
//   - the standalone short code is ABSENT (it cannot pair on its own; the
//     key lives only in the invite link). D-25.3.
//
// jsdom's <canvas> has no 2d context, so stub qrcode's canvas renderer.
vi.mock("qrcode", () => ({
  default: { toCanvas: vi.fn(() => Promise.resolve()) },
}));

const CODE = "ABCD1234";
// Real 32-byte key base64 with + / = so we prove the special chars survive
// the copy (this is the exact bug class the PRD fixes).
const KEY_B64 = "+/ab+/cd+/ef+/gh+/ij+/kl+/mn+/op+/qr+/st+/uv+/wx==";

const expectedUrl = () =>
  buildInviteUrl(buildInvitePayload(CODE, KEY_B64), {
    origin: window.location.origin,
  });

afterEach(() => {
  vi.restoreAllMocks();
  // Undo any clipboard stub so it can't leak into other suites.
  Object.assign(navigator, { clipboard: undefined });
});

describe("PRD-24 QA: Copy button copies the FULL invite URL, not the short code", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes the full deep-link URL (containing the full v1:code:key payload) to the clipboard", async () => {
    const writeText = vi.fn((text: string): Promise<void> => {
      void text;
      return Promise.resolve();
    });
    Object.assign(navigator, { clipboard: { writeText } });

    const { getByRole } = render(() => (
      <InviteQR code={CODE} keyBase64={KEY_B64} />
    ));
    fireEvent.click(getByRole("button", { name: "Copy invite link" }));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));

    const copied = writeText.mock.calls[0]![0];
    // It is the full URL, not the short code.
    expect(copied).toBe(expectedUrl());
    expect(copied).not.toBe(CODE);
    // The copied text carries the full payload (code + full key) in its
    // fragment — this is what makes manual pairing work.
    const payload = parseInviteUrl(copied);
    expect(payload).toBe(buildInvitePayload(CODE, KEY_B64));
    // The full key base64 (with + / =) survived the copy untruncated.
    expect(payload).toContain(KEY_B64);
  });

  it("does NOT show a standalone actionable short code (PRD-25 D-25.3)", () => {
    const { queryByText, getByRole, getByLabelText } = render(() => (
      <InviteQR code={CODE} keyBase64={KEY_B64} />
    ));
    // The standalone code line is gone; the code appears only embedded inside
    // the invite-link URL (a textarea value / QR), never as its own text node.
    expect(queryByText(CODE)).toBeNull();
    // The two real shareables remain: the copyable invite link + copy button.
    expect(getByLabelText("Full invite link")).toBeInTheDocument();
    expect(
      getByRole("button", { name: "Copy invite link" }),
    ).toBeInTheDocument();
  });
});

describe("PRD-24 QA: clipboard failure degrades gracefully (no crash, manual copy surfaced)", () => {
  it("clipboard.writeText REJECTS -> no crash, field selected so the full invite is copyable", async () => {
    const writeText = vi.fn(() =>
      Promise.reject(new DOMException("blocked", "NotAllowedError")),
    );
    Object.assign(navigator, { clipboard: { writeText } });

    const { getByRole, getByLabelText } = render(() => (
      <InviteQR code={CODE} keyBase64={KEY_B64} />
    ));
    const field = getByLabelText("Full invite link") as HTMLTextAreaElement;
    const selectSpy = vi.spyOn(field, "select");

    // Must not throw despite the rejected promise.
    expect(() =>
      fireEvent.click(getByRole("button", { name: "Copy invite link" })),
    ).not.toThrow();

    // Falls back to selecting the field so the user can copy manually, and
    // the field still holds the FULL invite URL (not a truncated code).
    await waitFor(() => expect(selectSpy).toHaveBeenCalled());
    expect(field.value).toBe(expectedUrl());
    // The field holds the full URL; its fragment decodes back to the full
    // payload (raw key with + / = intact) — nothing truncated.
    expect(parseInviteUrl(field.value)).toContain(KEY_B64);
    // Transient "Copied" acknowledgement still fires on the fallback path.
    await waitFor(() =>
      expect(getByRole("button", { name: "Copied" })).toBeInTheDocument(),
    );
  });

  it("no clipboard API at all -> selects the field, surfaces full invite, no crash", async () => {
    Object.assign(navigator, { clipboard: undefined });

    const { getByRole, getByLabelText } = render(() => (
      <InviteQR code={CODE} keyBase64={KEY_B64} />
    ));
    const field = getByLabelText("Full invite link") as HTMLTextAreaElement;
    const selectSpy = vi.spyOn(field, "select");

    expect(() =>
      fireEvent.click(getByRole("button", { name: "Copy invite link" })),
    ).not.toThrow();

    await waitFor(() => expect(selectSpy).toHaveBeenCalled());
    expect(field.value).toBe(expectedUrl());
  });
});
