import { createSignal, For, Show } from "solid-js";
import { friendlyClaimError } from "~/lib/data/claims";
import type { Claim, Coupon } from "~/lib/data/types";
import { addDays, localDateString } from "~/lib/format/date";
import { accept, cancel, declineC, deliver, nudge, withdraw } from "~/lib/stores/claims";

interface Props {
  claim: Claim;
  coupon: Coupon | undefined;
  userId: string;
  partnerName: string;
}

const DAY_MS = 86_400_000;

export function claimStatusText(c: Claim, mine: boolean, partner: string): string {
  switch (c.status) {
    case "pending":
      return mine ? `Waiting for ${partner}` : "Waiting for you";
    case "accepted":
      return mine ? `${partner} said yes` : "You said yes";
    case "delivered":
      return "Delivered";
    case "declined":
      return mine ? `${partner} can't right now — hearts returned` : "You passed — hearts returned";
    case "withdrawn":
      return "Withdrawn — hearts returned";
    case "cancelled":
      return "Cancelled — hearts returned";
    case "auto_refunded":
      return "No answer in 14 days — hearts returned";
  }
}

export type Urgency = "today" | "soon" | "later" | "undated";

// How soon an accepted claim happens: today/tomorrow, within a week, later.
export function urgencyOf(date: string | null): Urgency {
  if (!date) return "undated";
  const today = localDateString();
  if (date <= addDays(today, 1)) return "today";
  if (date <= addDays(today, 7)) return "soon";
  return "later";
}

const fmtStamp = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(
        new Date(iso),
      )
    : null;

// Future-facing date label, e.g. "tomorrow" / "Sat, Oct 3".
export function scheduleLabel(date: string): string {
  const today = localDateString();
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(y, m - 1, d),
  );
}

export default function ClaimRow(props: Props) {
  const [mode, setMode] = createSignal<"idle" | "accept" | "decline" | "cancel">("idle");
  const [date, setDate] = createSignal("");
  const [note, setNote] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  const [details, setDetails] = createSignal(false);
  const stamps = (): [string, string][] => {
    const c = props.claim;
    const rows: [string, string | null][] = [
      ["Claimed", fmtStamp(c.claimed_at)],
      ["Accepted", fmtStamp(c.accepted_at)],
      ["Planned for", c.scheduled_date ? scheduleLabel(c.scheduled_date) : null],
      ["Delivered", fmtStamp(c.delivered_at)],
      ["Declined", fmtStamp(c.declined_at)],
      ["Withdrawn", fmtStamp(c.withdrawn_at)],
      ["Cancelled", fmtStamp(c.cancelled_at)],
      ["Returned automatically", fmtStamp(c.auto_refunded_at)],
      ["Reminder sent", fmtStamp(c.nudged_at)],
      ["Hearts", String(c.price_at_claim)],
    ];
    return rows.filter((r): r is [string, string] => r[1] !== null);
  };
  const mine = () => props.claim.claimer_id === props.userId;
  const deliverer = () => props.claim.deliverer_id === props.userId;
  const canNudge = () => {
    const c = props.claim;
    if (!mine() || c.status !== "pending") return false;
    const age = Date.now() - new Date(c.claimed_at).getTime();
    const sinceNudge = c.nudged_at ? Date.now() - new Date(c.nudged_at).getTime() : Infinity;
    return age >= 7 * DAY_MS && sinceNudge >= DAY_MS;
  };

  const run = async (
    action: "accept" | "decline" | "deliver" | "withdraw" | "cancel" | "nudge",
  ) => {
    setBusy(true);
    setError("");
    const n = note().trim() || null;
    try {
      if (action === "accept") await accept(props.claim.id, date() || null, n);
      if (action === "decline") await declineC(props.claim.id, n);
      if (action === "deliver") await deliver(props.claim.id);
      if (action === "withdraw") await withdraw(props.claim.id);
      if (action === "cancel") await cancel(props.claim.id, n);
      if (action === "nudge") await nudge(props.claim.id);
      setMode("idle");
      setNote("");
      setDate("");
    } catch (err) {
      setError(friendlyClaimError(err));
    } finally {
      setBusy(false);
    }
  };

  const submitMode = (e: Event) => {
    e.preventDefault();
    const m = mode();
    if (m !== "idle") void run(m);
  };

  return (
    <li class="claim" classList={{ [`claim--${props.claim.status}`]: true }}>
      <div class="claim-main">
        <span class="coupon-emoji" aria-hidden="true">{props.coupon?.emoji || "♡"}</span>
        <div class="claim-body">
          <p class="claim-title">
            <Show when={!mine()} fallback={<>You claimed </>}>
              {props.partnerName} would love{" "}
            </Show>
            <strong>{props.coupon?.title ?? "a coupon"}</strong>
          </p>
          <p class="claim-status">
            <span class="claim-state" classList={{ [`claim-state--${props.claim.status}`]: true }}>
              {claimStatusText(props.claim, mine(), props.partnerName)}
            </span>
            <Show when={props.claim.status === "accepted"}>
              <span class="when-chip" classList={{ [`when-chip--${urgencyOf(props.claim.scheduled_date)}`]: true }}>
                {props.claim.scheduled_date ? scheduleLabel(props.claim.scheduled_date) : "date to agree"}
              </span>
            </Show>
          </p>
          <Show when={props.claim.accept_note && props.claim.status === "accepted"}>
            <p class="claim-note">"{props.claim.accept_note}"</p>
          </Show>
          <Show when={props.claim.decline_reason && props.claim.status === "declined"}>
            <p class="claim-note">"{props.claim.decline_reason}"</p>
          </Show>
          <Show when={props.claim.cancel_note && props.claim.status === "cancelled"}>
            <p class="claim-note">"{props.claim.cancel_note}"</p>
          </Show>
        </div>
        <span class="coupon-price">{props.claim.price_at_claim}</span>
      </div>

      <Show when={details()}>
        <dl class="claim-details">
          <For each={stamps()}>
            {([k, v]) => (
              <>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </>
            )}
          </For>
        </dl>
      </Show>

      <Show when={mode() === "idle"}>
        <div class="claim-actions">
          <Show when={deliverer() && props.claim.status === "pending"}>
            <button type="button" class="small" onClick={() => setMode("accept")} disabled={busy()}>
              Yes, let's plan it
            </button>
            <button type="button" class="quiet small" onClick={() => setMode("decline")} disabled={busy()}>
              Not right now
            </button>
          </Show>
          <Show when={deliverer() && props.claim.status === "accepted"}>
            <button type="button" class="small" onClick={() => void run("deliver")} disabled={busy()}>
              Mark delivered
            </button>
          </Show>
          <Show when={props.claim.status === "accepted"}>
            <button type="button" class="link-button" onClick={() => setMode("cancel")} disabled={busy()}>
              Cancel
            </button>
          </Show>
          <Show when={mine() && props.claim.status === "pending"}>
            <button type="button" class="link-button" onClick={() => void run("withdraw")} disabled={busy()}>
              Withdraw
            </button>
          </Show>
          <Show when={canNudge()}>
            <button type="button" class="link-button" onClick={() => void run("nudge")} disabled={busy()}>
              Send a gentle reminder
            </button>
          </Show>
          <button
            type="button"
            class="link-button claim-details-toggle"
            aria-expanded={details()}
            onClick={() => setDetails((v) => !v)}
          >
            {details() ? "Less" : "Details"}
          </button>
        </div>
      </Show>

      <Show when={mode() !== "idle"}>
        <form class="claim-form" onSubmit={submitMode}>
          <Show when={mode() === "accept"}>
            <label>
              When? (optional)
              <input
                type="date"
                min={localDateString()}
                max={addDays(localDateString(), 365)}
                value={date()}
                onInput={(e) => setDate(e.currentTarget.value)}
                disabled={busy()}
              />
            </label>
          </Show>
          <label>
            {mode() === "accept"
              ? "A note (optional)"
              : mode() === "decline"
                ? "Why not right now? (optional)"
                : "Why cancel? (optional)"}
            <input
              type="text"
              maxLength={200}
              value={note()}
              placeholder={mode() === "accept" ? "Saturday morning?" : ""}
              onInput={(e) => setNote(e.currentTarget.value)}
              disabled={busy()}
            />
          </label>
          <div class="claim-actions">
            <button type="submit" class="small" disabled={busy()}>
              {mode() === "accept" ? "Say yes" : mode() === "decline" ? "Pass, return hearts" : "Cancel, return hearts"}
            </button>
            <button type="button" class="quiet small" onClick={() => setMode("idle")} disabled={busy()}>
              Back
            </button>
          </div>
        </form>
      </Show>

      <Show when={error()}>
        <p class="error" role="alert">{error()}</p>
      </Show>
    </li>
  );
}

export function ClaimList(props: {
  claims: Claim[];
  coupons: Map<string, Coupon>;
  userId: string;
  partnerName: string;
}) {
  return (
    <ul class="claim-list">
      <For each={props.claims}>
        {(c) => (
          <ClaimRow
            claim={c}
            coupon={props.coupons.get(c.coupon_id)}
            userId={props.userId}
            partnerName={props.partnerName}
          />
        )}
      </For>
    </ul>
  );
}
