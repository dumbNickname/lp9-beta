import { createSignal, Show } from "solid-js";
import HeartIcon from "~/components/HeartIcon";
import { friendlyCouponError } from "~/lib/data/coupons";
import type { Coupon } from "~/lib/data/types";
import { privateMode } from "~/lib/privacy";
import { isCouponPrivate, toggleCouponPrivate } from "~/lib/privateCoupons";

export interface CouponActions {
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onApprove?: () => Promise<void>;
  onDecline?: (note: string | null) => Promise<void>;
  onRetire?: () => Promise<void>;
  onClaim?: () => Promise<void>;
}

interface Props extends CouponActions {
  coupon: Coupon;
  mine: boolean;
  partnerName: string;
  // PRD-40: my approved coupon whose price fits my spendable balance.
  affordable?: boolean;
  // An open (pending/accepted) claim exists for this coupon.
  claimed?: boolean;
}

function statusLabel(c: Coupon, mine: boolean, partner: string, claimed: boolean): string {
  if (claimed && c.status === "approved") return "Claimed";
  switch (c.status) {
    case "draft":
      return mine ? `Waiting for ${partner}` : "Waiting for you";
    case "approved":
      return "Ready";
    case "declined":
      return mine ? `Not for ${partner}` : "You passed";
    case "retired":
      return "Retired";
  }
}

export default function CouponCard(props: Props) {
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [declining, setDeclining] = createSignal(false);
  const [note, setNote] = createSignal("");

  const hidden = () => privateMode() && isCouponPrivate(props.coupon.id);

  const run = async (action: "delete" | "approve" | "decline" | "retire" | "claim") => {
    if (action === "retire" && !window.confirm("Retire this coupon? It can't be claimed any more.")) {
      return;
    }
    if (action === "delete" && !window.confirm("Delete this coupon?")) return;
    if (
      action === "claim" &&
      !window.confirm(
        `Claim "${props.coupon.title}" for ${props.coupon.price} hearts? They're set aside until ${props.partnerName} delivers, and returned if it doesn't happen.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (action === "delete") await props.onDelete?.();
      if (action === "approve") await props.onApprove?.();
      if (action === "retire") await props.onRetire?.();
      if (action === "claim") await props.onClaim?.();
      if (action === "decline") {
        await props.onDecline?.(note().trim() || null);
        setDeclining(false);
      }
    } catch (err) {
      setError(friendlyCouponError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li
      class="coupon"
      classList={{
        [`coupon--${props.coupon.status}`]: true,
        "coupon--hidden": hidden(),
        "coupon--affordable": !!props.affordable && !props.claimed && !hidden(),
      }}
    >
      <Show
        when={!hidden()}
        fallback={
          <div class="coupon-hidden">
            <span>Hidden coupon — turn off private mode to view</span>
            <button type="button" class="link-button" onClick={() => toggleCouponPrivate(props.coupon.id)}>
              Unmark
            </button>
          </div>
        }
      >
        <div class="coupon-main">
          <span class="coupon-emoji" aria-hidden="true">{props.coupon.emoji || "♡"}</span>
          <div class="coupon-body">
            <h3 class="coupon-title">{props.coupon.title}</h3>
            <Show when={props.coupon.description}>
              <p class="coupon-desc">{props.coupon.description}</p>
            </Show>
            <Show when={props.coupon.boundaries_note}>
              <p class="coupon-bounds">
                <span class="coupon-bounds-label">Boundaries:</span> {props.coupon.boundaries_note}
              </p>
            </Show>
            <Show when={props.coupon.status === "declined" && props.coupon.decline_note}>
              <p class="coupon-bounds">"{props.coupon.decline_note}"</p>
            </Show>
          </div>
          <span class="coupon-price" aria-label={`${props.coupon.price} hearts`}>
            {props.coupon.price}
            <HeartIcon filled />
          </span>
        </div>

        <div class="coupon-foot">
          <span
            class="chip"
            classList={{
              [`chip--${props.coupon.status}`]: true,
              "chip--claimed": !!props.claimed,
              "chip--affordable": !!props.affordable && !props.claimed,
            }}
          >
            {props.affordable && !props.claimed
              ? "You have enough"
              : statusLabel(props.coupon, props.mine, props.partnerName, !!props.claimed)}
          </span>
          <span class="coupon-actions">
            <Show when={props.onClaim && props.affordable && !props.claimed}>
              <button type="button" class="small" onClick={() => void run("claim")} disabled={busy()}>
                Claim
              </button>
            </Show>
            <Show when={props.onApprove && props.coupon.status === "draft"}>
              <button type="button" class="small" onClick={() => void run("approve")} disabled={busy()}>
                Yes, I'm in
              </button>
              <button
                type="button"
                class="quiet small"
                onClick={() => setDeclining((v) => !v)}
                disabled={busy()}
              >
                Not for me
              </button>
            </Show>
            <Show when={props.onEdit && props.coupon.status === "draft"}>
              <button type="button" class="link-button" onClick={() => props.onEdit?.()}>
                Edit
              </button>
            </Show>
            <Show
              when={
                props.onDelete &&
                (props.coupon.status === "draft" || props.coupon.status === "declined")
              }
            >
              <button type="button" class="link-button" onClick={() => void run("delete")} disabled={busy()}>
                Delete
              </button>
            </Show>
            <Show when={props.onRetire && props.coupon.status === "approved"}>
              <button type="button" class="link-button" onClick={() => void run("retire")} disabled={busy()}>
                Retire
              </button>
            </Show>
            <Show when={props.coupon.status !== "retired"}>
              <button
                type="button"
                class="link-button"
                aria-pressed={isCouponPrivate(props.coupon.id)}
                onClick={() => toggleCouponPrivate(props.coupon.id)}
              >
                {isCouponPrivate(props.coupon.id) ? "Unmark private" : "Mark private"}
              </button>
            </Show>
          </span>
        </div>

        <Show when={declining()}>
          <form
            class="coupon-decline"
            onSubmit={(e) => {
              e.preventDefault();
              void run("decline");
            }}
          >
            <label>
              A kind note (optional)
              <input
                type="text"
                maxLength={200}
                value={note()}
                placeholder="Maybe something else instead?"
                onInput={(e) => setNote(e.currentTarget.value)}
                disabled={busy()}
              />
            </label>
            <button type="submit" class="quiet small" disabled={busy()}>
              Pass on this one
            </button>
          </form>
        </Show>
      </Show>
      <Show when={error()}>
        <p class="error" role="alert">{error()}</p>
      </Show>
    </li>
  );
}
