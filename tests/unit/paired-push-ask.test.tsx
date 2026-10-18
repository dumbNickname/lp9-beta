import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.fn();
const enable = vi.fn();

vi.mock("~/lib/push", () => ({
  currentPushState: () => state(),
  enablePush: () => enable(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PairedPushAsk", () => {
  it("off: one tap asks the browser, never on load", async () => {
    state.mockResolvedValue("off");
    enable.mockResolvedValue("on");
    const { default: Ask } = await import("~/components/PairedPushAsk");
    render(() => <Ask partnerName="Ben" />);
    const btn = await screen.findByRole("button", { name: "Tell me when Ben appreciates me" });
    expect(enable).not.toHaveBeenCalled();
    fireEvent.click(btn);
    expect(await screen.findByText(/Notifications on/)).toBeInTheDocument();
    expect(enable).toHaveBeenCalledTimes(1);
  });

  it("already on or unsupported: no ask button", async () => {
    for (const s of ["on", "unsupported", "unconfigured"]) {
      state.mockResolvedValue(s);
      const { default: Ask } = await import("~/components/PairedPushAsk");
      render(() => <Ask partnerName="Ben" />);
      await Promise.resolve();
      expect(screen.queryByRole("button")).toBeNull();
      cleanup();
    }
  });
});
