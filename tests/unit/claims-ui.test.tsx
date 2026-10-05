import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Claim, Coupon } from "~/lib/data/types";
import { addDays, localDateString } from "~/lib/format/date";

const rpc = vi.fn();
vi.mock("~/lib/supabase", () => ({
  supabase: { from: vi.fn(), rpc: (...a: unknown[]) => rpc(...a), auth: { getUser: vi.fn() } },
  getSupabase: vi.fn(),
}));

function claim(over: Partial<Claim> = {}): Claim {
  return {
    id: "k1",
    coupon_id: "c1",
    relationship_id: "r1",
    claimer_id: "bob",
    deliverer_id: "me",
    price_at_claim: 8,
    status: "pending",
    scheduled_date: null,
    accept_note: null,
    decline_reason: null,
    cancel_note: null,
    cancelled_by: null,
    claimed_at: new Date().toISOString(),
    accepted_at: null,
    declined_at: null,
    delivered_at: null,
    delivered_by: null,
    withdrawn_at: null,
    cancelled_at: null,
    auto_refunded_at: null,
    nudged_at: null,
    ...over,
  };
}

const coupon = { id: "c1", title: "Breakfast in bed", emoji: "x" } as Coupon;

beforeEach(() => {
  rpc.mockResolvedValue({ data: null, error: null });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  rpc.mockReset();
});

describe("ClaimRow", () => {
  it("deliverer accepts with date + note", async () => {
    const ClaimRow = (await import("~/components/ClaimRow")).default;
    const { getByRole, getByText, container } = render(() => (
      <ClaimRow claim={claim()} coupon={coupon} userId="me" partnerName="Bob" />
    ));
    expect(getByText(/Bob would love/)).toBeInTheDocument();
    expect(getByText("Waiting for you")).toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: /yes, let's plan it/i }));
    const date = container.querySelector('input[type="date"]') as HTMLInputElement;
    const when = addDays(localDateString(), 3);
    fireEvent.input(date, { target: { value: when } });
    fireEvent.input(getByRole("textbox"), { target: { value: "Saturday morning?" } });
    fireEvent.click(getByRole("button", { name: "Say yes" }));
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("accept_claim", {
        p_claim_id: "k1",
        p_date: when,
        p_note: "Saturday morning?",
      }),
    );
  });

  it("deliverer declines; accepted shows We did it + Cancel", async () => {
    const ClaimRow = (await import("~/components/ClaimRow")).default;
    const r = render(() => <ClaimRow claim={claim()} coupon={coupon} userId="me" partnerName="Bob" />);
    fireEvent.click(r.getByRole("button", { name: /not right now/i }));
    fireEvent.click(r.getByRole("button", { name: /pass, return hearts/i }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("decline_claim", { p_claim_id: "k1", p_reason: null }));
    cleanup();
    const r2 = render(() => (
      <ClaimRow claim={claim({ status: "accepted", scheduled_date: null })} coupon={coupon} userId="me" partnerName="Bob" />
    ));
    fireEvent.click(r2.getByRole("button", { name: "We did it" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("deliver_claim", { p_claim_id: "k1" }));
    expect(r2.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("claimer can also mark an accepted claim done", async () => {
    const ClaimRow = (await import("~/components/ClaimRow")).default;
    const r = render(() => (
      <ClaimRow
        claim={claim({ claimer_id: "me", deliverer_id: "bob", status: "accepted" })}
        coupon={coupon}
        userId="me"
        partnerName="Bob"
      />
    ));
    fireEvent.click(r.getByRole("button", { name: "We did it" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("deliver_claim", { p_claim_id: "k1" }));
  });

  it("done claim shows Done and who marked it in details", async () => {
    const ClaimRow = (await import("~/components/ClaimRow")).default;
    const r = render(() => (
      <ClaimRow
        claim={claim({ status: "delivered", delivered_at: new Date().toISOString(), delivered_by: "bob" })}
        coupon={coupon}
        userId="me"
        partnerName="Bob"
      />
    ));
    expect(r.getByText("Done")).toBeInTheDocument();
    expect(r.queryByRole("button", { name: "We did it" })).toBeNull();
    fireEvent.click(r.getByRole("button", { name: "Details" }));
    expect(r.getByText("Marked done by")).toBeInTheDocument();
    expect(r.getAllByText("Bob").length).toBeGreaterThan(0);
  });

  it("claimer: withdraw when pending, no deliverer actions, nudge only after 7 days", async () => {
    const ClaimRow = (await import("~/components/ClaimRow")).default;
    const fresh = render(() => (
      <ClaimRow claim={claim({ claimer_id: "me", deliverer_id: "bob" })} coupon={coupon} userId="me" partnerName="Bob" />
    ));
    expect(fresh.getByText("Waiting for Bob")).toBeInTheDocument();
    expect(fresh.queryByRole("button", { name: /yes, let's plan it/i })).toBeNull();
    expect(fresh.queryByRole("button", { name: /reminder/i })).toBeNull();
    fireEvent.click(fresh.getByRole("button", { name: "Withdraw" }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("withdraw_claim", { p_claim_id: "k1" }));
    cleanup();
    const old = new Date(Date.now() - 8 * 86_400_000).toISOString();
    const r = render(() => (
      <ClaimRow
        claim={claim({ claimer_id: "me", deliverer_id: "bob", claimed_at: old })}
        coupon={coupon}
        userId="me"
        partnerName="Bob"
      />
    ));
    expect(r.getByRole("button", { name: /gentle reminder/i })).toBeInTheDocument();
  });

  it("terminal statuses say hearts were returned", async () => {
    const { claimStatusText } = await import("~/lib/claims");
    for (const s of ["declined", "withdrawn", "cancelled", "auto_refunded"] as const) {
      expect(claimStatusText(claim({ status: s }), true, "Bob")).toMatch(/hearts returned/);
    }
  });
});

describe("ComingUp", () => {
  it("places dated accepted claims on the strip and lists undated", async () => {
    const ComingUp = (await import("~/components/ComingUp")).default;
    const { addDays, localDateString } = await import("~/lib/format/date");
    const d = addDays(localDateString(), 3);
    const { container, getByText } = render(() => (
      <ComingUp
        claims={[
          claim({ id: "a", status: "accepted", scheduled_date: d }),
          claim({ id: "b", status: "accepted", scheduled_date: null, coupon_id: "c2" }),
          claim({ id: "c", status: "pending" }),
        ]}
        coupons={new Map([["c1", coupon], ["c2", { ...coupon, id: "c2", title: "Walk" }]])}
        userId="me"
        partnerName="Bob"
      />
    ));
    expect(container.querySelectorAll(".cal-day").length).toBe(14);
    expect(container.querySelectorAll(".cal-day.has-plan").length).toBe(1);
    expect(getByText("Some day soon")).toBeInTheDocument();
    expect(container.querySelectorAll(".plan").length).toBe(2);
  });

  it("labels an accepted claim whose date has passed honestly, not as Later", async () => {
    const ComingUp = (await import("~/components/ComingUp")).default;
    const { addDays, localDateString } = await import("~/lib/format/date");
    const { queryByText, getByText } = render(() => (
      <ComingUp
        claims={[
          claim({ id: "p", status: "accepted", scheduled_date: addDays(localDateString(), -2) }),
          claim({ id: "f", status: "accepted", scheduled_date: addDays(localDateString(), 30), coupon_id: "c2" }),
        ]}
        coupons={new Map([["c1", coupon], ["c2", { ...coupon, id: "c2", title: "Walk" }]])}
        userId="me"
        partnerName="Bob"
      />
    ));
    expect(getByText("Date passed")).toBeInTheDocument();
    expect(queryByText("Some day soon")).toBeNull();
    expect(getByText("Later")).toBeInTheDocument();
  });
});

describe("CouponCard affordable + claim", () => {
  it("highlights affordable and claims after confirm", async () => {
    const CouponCard = (await import("~/components/CouponCard")).default;
    const onClaim = vi.fn(() => Promise.resolve());
    const c = { ...coupon, status: "approved", price: 5, receiver_id: "me", giver_id: "bob" } as Coupon;
    const { container, getByRole, getByText } = render(() => (
      <CouponCard coupon={c} mine partnerName="Bob" affordable onClaim={onClaim} />
    ));
    expect(container.querySelector(".coupon--affordable")).not.toBeNull();
    expect(getByText("You have enough")).toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: "Claim" }));
    await waitFor(() => expect(onClaim).toHaveBeenCalled());
  });

  it("claimed coupon: no highlight, no claim button", async () => {
    const CouponCard = (await import("~/components/CouponCard")).default;
    const c = { ...coupon, status: "approved", price: 5 } as Coupon;
    const { container, queryByRole, getByText } = render(() => (
      <CouponCard coupon={c} mine partnerName="Bob" affordable claimed onClaim={vi.fn()} />
    ));
    expect(container.querySelector(".coupon--affordable")).toBeNull();
    expect(queryByRole("button", { name: "Claim" })).toBeNull();
    expect(getByText("Claimed")).toBeInTheDocument();
  });

  it("saving up: shows 'N more hearts to go' next to the chip, not in the stub", async () => {
    const CouponCard = (await import("~/components/CouponCard")).default;
    const c = { ...coupon, status: "approved", price: 20 } as Coupon;
    const { container, getByText } = render(() => (
      <CouponCard coupon={c} mine partnerName="Bob" short={5} />
    ));
    expect(getByText("5 more hearts to go")).toBeInTheDocument();
    expect(container.querySelector(".ticket-stub")!.textContent).toBe("20");
    expect(container.querySelectorAll(".stamp")).toHaveLength(10);
    expect(container.querySelectorAll(".stamp.is-on")).toHaveLength(7);
  });
});

