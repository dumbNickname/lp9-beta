import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Coupon } from "~/lib/data/types";

vi.mock("~/lib/supabase", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn(), auth: { getUser: vi.fn() } },
  getSupabase: vi.fn(),
}));

function coupon(over: Partial<Coupon> = {}): Coupon {
  return {
    id: "c1",
    relationship_id: "r1",
    receiver_id: "bob",
    giver_id: "me",
    title: "Breakfast in bed",
    description: null,
    boundaries_note: "weekends",
    emoji: "x",
    price: 8,
    status: "draft",
    decline_note: null,
    template_key: null,
    created_at: "2026-09-29T10:00:00Z",
    approved_at: null,
    declined_at: null,
    retired_at: null,
    ...over,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CouponCard", () => {
  it("giver sees approve + decline on a draft", async () => {
    const CouponCard = (await import("~/components/CouponCard")).default;
    const onApprove = vi.fn(() => Promise.resolve());
    const onDecline = vi.fn<(n: string | null) => Promise<void>>(() => Promise.resolve());
    const { getByRole, getByText } = render(() => (
      <CouponCard coupon={coupon()} mine={false} partnerName="Bob" onApprove={onApprove} onDecline={onDecline} />
    ));
    expect(getByText("Waiting for you")).toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: "Yes, I'm in" }));
    await waitFor(() => expect(onApprove).toHaveBeenCalled());
    fireEvent.click(getByRole("button", { name: "Not for me" }));
    fireEvent.input(getByRole("textbox"), { target: { value: "  maybe later " } });
    fireEvent.click(getByRole("button", { name: /pass on this one/i }));
    await waitFor(() => expect(onDecline).toHaveBeenCalledWith("maybe later"));
  });

  it("receiver sees waiting chip, edit + delete on draft, no approve", async () => {
    const CouponCard = (await import("~/components/CouponCard")).default;
    const onDelete = vi.fn(() => Promise.resolve());
    const onEdit = vi.fn();
    const { getByRole, queryByRole, getByText } = render(() => (
      <CouponCard
        coupon={coupon({ receiver_id: "me", giver_id: "bob" })}
        mine
        partnerName="Bob"
        onEdit={onEdit}
        onDelete={onDelete}
        onRetire={vi.fn()}
      />
    ));
    expect(getByText("Waiting for Bob")).toBeInTheDocument();
    expect(queryByRole("button", { name: "Yes, I'm in" })).toBeNull();
    expect(queryByRole("button", { name: "Retire" })).toBeNull();
    fireEvent.click(getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalled();
    fireEvent.click(getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalled());
  });

  it("approved: retire only, no edit/delete", async () => {
    const CouponCard = (await import("~/components/CouponCard")).default;
    const onRetire = vi.fn(() => Promise.resolve());
    const { getByRole, queryByRole, getByText } = render(() => (
      <CouponCard
        coupon={coupon({ status: "approved" })}
        mine
        partnerName="Bob"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRetire={onRetire}
      />
    ));
    expect(getByText("Agreed")).toBeInTheDocument();
    expect(queryByRole("button", { name: "Edit" })).toBeNull();
    expect(queryByRole("button", { name: "Delete" })).toBeNull();
    fireEvent.click(getByRole("button", { name: "Retire" }));
    await waitFor(() => expect(onRetire).toHaveBeenCalled());
  });

  it("declined shows note to receiver", async () => {
    const CouponCard = (await import("~/components/CouponCard")).default;
    const { getByText } = render(() => (
      <CouponCard coupon={coupon({ status: "declined", decline_note: "not my thing" })} mine partnerName="Bob" />
    ));
    expect(getByText("Not for Bob")).toBeInTheDocument();
    expect(getByText(/not my thing/)).toBeInTheDocument();
  });

  it("private flag: placeholder only while private mode is on; persisted locally", async () => {
    const { setPrivateMode } = await import("~/lib/privacy");
    const CouponCard = (await import("~/components/CouponCard")).default;
    setPrivateMode(false);
    const { getByRole, queryByText, getByText } = render(() => (
      <CouponCard coupon={coupon()} mine={false} partnerName="Bob" />
    ));
    fireEvent.click(getByRole("button", { name: "Mark private" }));
    expect(JSON.parse(localStorage.getItem("private_coupons")!)).toEqual(["c1"]);
    expect(getByText("Breakfast in bed")).toBeInTheDocument();
    setPrivateMode(true);
    expect(queryByText("Breakfast in bed")).toBeNull();
    // Tap the veil -> "Turn private mode off" (window.confirm fallback = cancel
    // path here, so drive the choice through setPrivateMode instead).
    expect(getByRole("button", { name: /hidden coupon/i })).toBeInTheDocument();
    setPrivateMode(false);
    expect(getByText("Breakfast in bed")).toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: "Unmark private" }));
    expect(JSON.parse(localStorage.getItem("private_coupons")!)).toEqual([]);
  });
});

describe("CouponForm", () => {
  it("clamps price 1..50 and submits trimmed input", async () => {
    const CouponForm = (await import("~/components/CouponForm")).default;
    const onSubmit = vi.fn<(i: unknown) => Promise<void>>(() => Promise.resolve());
    const { getByRole, getByLabelText } = render(() => (
      <CouponForm partnerName="Bob" submitLabel="Ask Bob" onSubmit={onSubmit} onCancel={vi.fn()} />
    ));
    fireEvent.input(getByLabelText(/what would you love/i), { target: { value: "  Picnic  " } });
    const hearts = getByLabelText("Hearts") as HTMLInputElement;
    fireEvent.input(hearts, { target: { value: "99" } });
    expect(hearts.value).toBe("50");
    fireEvent.click(getByRole("button", { name: "Fewer hearts" }));
    fireEvent.click(getByRole("button", { name: "Ask Bob" }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        title: "Picnic",
        emoji: null,
        price: 49,
        description: null,
        boundaries_note: null,
      }),
    );
  });

  it("shows the boundaries guidance", async () => {
    const CouponForm = (await import("~/components/CouponForm")).default;
    const { getByText } = render(() => (
      <CouponForm partnerName="Bob" submitLabel="Ask" onSubmit={vi.fn()} onCancel={vi.fn()} />
    ));
    expect(getByText(/what's a hard no/i)).toBeInTheDocument();
  });
});

describe("TemplatePicker", () => {
  it("preselects archetype, hides existing, adds picked", async () => {
    const TemplatePicker = (await import("~/components/TemplatePicker")).default;
    const { TEMPLATES } = await import("~/data/coupon-templates");
    const onAdd = vi.fn<(t: unknown[]) => Promise<void>>(() => Promise.resolve());
    const first = TEMPLATES.established_couple[0]!;
    const second = TEMPLATES.established_couple[1]!;
    const { getByRole, queryByText, getByText } = render(() => (
      <TemplatePicker archetype="established_couple" existingKeys={new Set([first.key])} onAdd={onAdd} />
    ));
    expect(getByRole("tab", { name: "Established couple" })).toHaveAttribute("aria-selected", "true");
    expect(queryByText(first.title)).toBeNull();
    fireEvent.click(getByText(second.title));
    fireEvent.click(getByRole("button", { name: "Add 1 to my list" }));
    await waitFor(() => expect(onAdd).toHaveBeenCalled());
    expect((onAdd.mock.calls[0]![0] as { key: string }[])[0]!.key).toBe(second.key);
  });

  it("template data: prices in range, unique keys", async () => {
    const { TEMPLATES } = await import("~/data/coupon-templates");
    const all = Object.values(TEMPLATES).flat();
    expect(new Set(all.map((t) => t.key)).size).toBe(all.length);
    for (const t of all) {
      expect(t.price).toBeGreaterThanOrEqual(1);
      expect(t.price).toBeLessThanOrEqual(50);
      expect(t.title.length).toBeLessThanOrEqual(80);
    }
  });
});
