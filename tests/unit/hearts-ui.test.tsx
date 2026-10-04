import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedItem } from "~/lib/stores/points";

const giveHearts = vi.fn<(...a: unknown[]) => Promise<void>>(() => Promise.resolve());

vi.mock("~/lib/supabase", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: { getUser: vi.fn() } },
  getSupabase: vi.fn(),
}));

vi.mock("~/lib/stores/points", async (orig) => ({
  ...(await orig<typeof import("~/lib/stores/points")>()),
  giveHearts: (...a: unknown[]) => giveHearts(...a),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("HeartComposer", () => {
  const base = {
    relationshipId: "r1",
    userId: "u1",
    partnerName: "Bob",
    onRestoreKey: vi.fn(),
  };

  it("send disabled until hearts chosen; sends amount + comment + today", async () => {
    const HeartComposer = (await import("~/components/HeartComposer")).default;
    const { getByRole, getByPlaceholderText, findByRole } = render(() => (
      <HeartComposer {...base} hasKey />
    ));
    expect(getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.click(getByRole("radio", { name: "3 hearts" }));
    const send = getByRole("button", { name: "Send 3 hearts" });
    expect(getByRole("radio", { name: "3 hearts" })).toHaveAttribute("aria-checked", "true");
    const ta = getByPlaceholderText(/./) as HTMLTextAreaElement;
    fireEvent.input(ta, { target: { value: "thanks for dinner" } });
    fireEvent.click(send);
    await waitFor(() => expect(giveHearts).toHaveBeenCalled());
    const [rel, user, amount, text, date] = giveHearts.mock.calls[0]!;
    expect([rel, user, amount, text]).toEqual(["r1", "u1", 3, "thanks for dinner"]);
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await findByRole("status")).toHaveTextContent(/Sent to Bob/);
  });

  it("arrow keys move the heart selection", async () => {
    const HeartComposer = (await import("~/components/HeartComposer")).default;
    const { getByRole } = render(() => <HeartComposer {...base} hasKey />);
    fireEvent.click(getByRole("radio", { name: "2 hearts" }));
    fireEvent.keyDown(getByRole("radio", { name: "2 hearts" }), { key: "ArrowRight" });
    expect(getByRole("radio", { name: "3 hearts" })).toHaveAttribute("aria-checked", "true");
  });

  it("comment has a 200 char cap and counter", async () => {
    const HeartComposer = (await import("~/components/HeartComposer")).default;
    const { container } = render(() => <HeartComposer {...base} hasKey />);
    const ta = container.querySelector("textarea")!;
    expect(ta.maxLength).toBe(200);
    fireEvent.input(ta, { target: { value: "x".repeat(190) } });
    expect(container.querySelector(".composer-counter")!.textContent).toBe("10");
  });

  it("backdate picker is bounded to the last 30 days", async () => {
    const HeartComposer = (await import("~/components/HeartComposer")).default;
    const { getByRole, container } = render(() => <HeartComposer {...base} hasKey />);
    fireEvent.click(getByRole("button", { name: /earlier/i }));
    const input = container.querySelector('input[type="date"]') as HTMLInputElement;
    const { addDays, localDateString } = await import("~/lib/format/date");
    expect(input.max).toBe(localDateString());
    expect(input.min).toBe(addDays(localDateString(), -30));
  });

  it("no key: comment disabled, restore offered, hearts-only send passes empty text", async () => {
    const HeartComposer = (await import("~/components/HeartComposer")).default;
    const onRestoreKey = vi.fn();
    const { getByRole, container } = render(() => (
      <HeartComposer {...base} hasKey={false} onRestoreKey={onRestoreKey} />
    ));
    expect(container.querySelector("textarea")).toBeNull();
    fireEvent.click(getByRole("button", { name: /unlock with your recovery password/i }));
    expect(onRestoreKey).toHaveBeenCalled();
    fireEvent.click(getByRole("radio", { name: "1 heart" }));
    fireEvent.click(getByRole("button", { name: "Send 1 heart" }));
    await waitFor(() => expect(giveHearts).toHaveBeenCalled());
    expect(giveHearts.mock.calls[0]![3]).toBe("");
  });
});

function item(over: Partial<FeedItem> = {}): FeedItem {
  return {
    id: "p1",
    relationship_id: "r1",
    giver_id: "bob",
    receiver_id: "u1",
    amount: 4,
    comment_ciphertext: new Uint8Array([1]),
    comment_iv: new Uint8Array(12),
    edited_at: null,
    event_date: "2026-09-29",
    created_at: new Date().toISOString(),
    comment: "you are lovely",
    locked: false,
    ...over,
  };
}

describe("HeartNote", () => {
  beforeEach(async () => {
    (await import("~/lib/privacy")).setPrivateMode(false);
  });

  const noteProps = {
    partnerName: "Bob",
    onEdit: vi.fn(() => Promise.resolve()),
    onUndo: vi.fn(() => Promise.resolve()),
    onRestoreKey: vi.fn(),
  };

  it("received note: shows comment + hearts, no edit/undo", async () => {
    const HeartNote = (await import("~/components/HeartNote")).default;
    const { getByText, getByRole, queryByRole } = render(() => (
      <HeartNote {...noteProps} item={item()} mine={false} />
    ));
    expect(getByText("you are lovely")).toBeInTheDocument();
    expect(getByRole("img", { name: "4 hearts" })).toBeInTheDocument();
    expect(getByText(/From Bob/)).toBeInTheDocument();
    expect(queryByRole("button", { name: "Edit" })).toBeNull();
    expect(queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("own fresh note: edit + undo available", async () => {
    const HeartNote = (await import("~/components/HeartNote")).default;
    const { getByRole } = render(() => (
      <HeartNote {...noteProps} item={item({ giver_id: "u1" })} mine />
    ));
    fireEvent.click(getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(noteProps.onUndo).toHaveBeenCalled());
  });

  it("own note after 5 min: edit only; after 24h: neither", async () => {
    const HeartNote = (await import("~/components/HeartNote")).default;
    const tenMin = new Date(Date.now() - 10 * 60_000).toISOString();
    const r1 = render(() => (
      <HeartNote {...noteProps} item={item({ giver_id: "u1", created_at: tenMin })} mine />
    ));
    expect(r1.queryByRole("button", { name: "Undo" })).toBeNull();
    expect(r1.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    cleanup();
    const old = new Date(Date.now() - 25 * 3600_000).toISOString();
    const r2 = render(() => (
      <HeartNote {...noteProps} item={item({ giver_id: "u1", created_at: old })} mine />
    ));
    expect(r2.queryByRole("button", { name: "Edit" })).toBeNull();
  });

  it("ticks only for my notes inside the edit window, and hides undo when it closes", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    try {
      const HeartNote = (await import("~/components/HeartNote")).default;
      const theirs = render(() => <HeartNote {...noteProps} item={item()} mine={false} />);
      expect(vi.getTimerCount()).toBe(0);
      theirs.unmount();
      const old = new Date(Date.now() - 25 * 3600_000).toISOString();
      const stale = render(() => (
        <HeartNote {...noteProps} item={item({ giver_id: "u1", created_at: old })} mine />
      ));
      expect(vi.getTimerCount()).toBe(0);
      stale.unmount();
      const fresh = item({ giver_id: "u1" });
      const r = render(() => <HeartNote {...noteProps} item={fresh} mine />);
      expect(vi.getTimerCount()).toBe(1);
      expect(r.getByRole("button", { name: "Undo" })).toBeInTheDocument();
      vi.advanceTimersByTime(6 * 60_000);
      expect(r.queryByRole("button", { name: "Undo" })).toBeNull();
      expect(r.getByRole("button", { name: "Edit" })).toBeInTheDocument();
      vi.advanceTimersByTime(24 * 3600_000);
      expect(r.queryByRole("button", { name: "Edit" })).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("edit saves new text", async () => {
    const HeartNote = (await import("~/components/HeartNote")).default;
    const { getByRole, container } = render(() => (
      <HeartNote {...noteProps} item={item({ giver_id: "u1" })} mine />
    ));
    fireEvent.click(getByRole("button", { name: "Edit" }));
    const ta = container.querySelector("textarea")!;
    expect(ta.value).toBe("you are lovely");
    fireEvent.input(ta, { target: { value: "you are wonderful" } });
    fireEvent.click(getByRole("button", { name: "Save" }));
    await waitFor(() => expect(noteProps.onEdit).toHaveBeenCalledWith("you are wonderful"));
  });

  it("edited badge + locked placeholder", async () => {
    const HeartNote = (await import("~/components/HeartNote")).default;
    const { getByText } = render(() => (
      <HeartNote
        {...noteProps}
        item={item({ edited_at: new Date().toISOString(), comment: null, locked: true })}
        mine={false}
      />
    ));
    expect(getByText("edited")).toBeInTheDocument();
    expect(getByText(/locked on this device/i)).toBeInTheDocument();
  });

  it("private mode hides the comment but keeps hearts", async () => {
    (await import("~/lib/privacy")).setPrivateMode(true);
    const HeartNote = (await import("~/components/HeartNote")).default;
    const { queryByText, getByRole } = render(() => (
      <HeartNote {...noteProps} item={item()} mine={false} />
    ));
    expect(queryByText("you are lovely")).toBeNull();
    expect(getByRole("button", { name: /hidden — private mode/i })).toBeInTheDocument();
    expect(getByRole("img", { name: "4 hearts" })).toBeInTheDocument();
  });

  it("tapping a veiled note asks; 'Show this one' reveals only that note", async () => {
    const privacy = await import("~/lib/privacy");
    privacy.setPrivateMode(true);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const HeartNote = (await import("~/components/HeartNote")).default;
    const { findByText, getByRole } = render(() => (
      <HeartNote {...noteProps} item={item()} mine={false} />
    ));
    fireEvent.click(getByRole("button", { name: /hidden — private mode/i }));
    expect(await findByText("you are lovely")).toBeInTheDocument();
    expect(privacy.privateMode()).toBe(true);
    // Turning the mode on again re-veils everything.
    privacy.setPrivateMode(false);
    privacy.setPrivateMode(true);
    expect(privacy.isVeiled(item().id)).toBe(true);
  });
});

describe("PrivacyToggle", () => {
  it("toggles aria-pressed and label", async () => {
    const { setPrivateMode } = await import("~/lib/privacy");
    setPrivateMode(true);
    const PrivacyToggle = (await import("~/components/PrivacyToggle")).default;
    const { getByRole } = render(() => <PrivacyToggle />);
    const btn = getByRole("button");
    expect(btn).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(btn).toHaveAccessibleName(/off/i);
    expect(localStorage.getItem("privacy_mode")).toBeNull();
    fireEvent.click(btn);
    expect(localStorage.getItem("privacy_mode")).toBe("on");
  });

  it("is off by default on a fresh device", async () => {
    localStorage.clear();
    vi.resetModules();
    const { privateMode } = await import("~/lib/privacy");
    expect(privateMode()).toBe(false);
  });
});
