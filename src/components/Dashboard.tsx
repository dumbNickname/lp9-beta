import { createEffect, createResource, createSignal, onCleanup, onMount, Show } from "solid-js";
import HeartComposer from "~/components/HeartComposer";
import HeartsFeed from "~/components/HeartsFeed";
import PairBadge from "~/components/PairBadge";
import PrivacyToggle from "~/components/PrivacyToggle";
import RecoveryPassword from "~/components/RecoveryPassword";
import { getDisplayName } from "~/lib/data/profile";
import type { Relationship } from "~/lib/data/types";
import {
  hasCommentKey,
  mySpendable,
  refreshPoints,
  usePointsFocusRefresh,
} from "~/lib/stores/points";

interface Props {
  relationship: Relationship;
  userId: string;
  displayName: string;
}

export default function Dashboard(props: Props) {
  const partnerId = () =>
    props.relationship.member_a === props.userId
      ? props.relationship.member_b
      : props.relationship.member_a;
  // Re-fetched on tab focus so a partner's rename shows up (PRD-34).
  const [partnerTick, setPartnerTick] = createSignal(0);
  const [partnerNameRes] = createResource(
    () => ({ id: partnerId(), tick: partnerTick() }),
    ({ id }) => getDisplayName(id).catch(() => null),
  );
  const partnerName = () => partnerNameRes.latest || "your partner";
  onMount(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") setPartnerTick((t) => t + 1);
    };
    document.addEventListener("visibilitychange", onFocus);
    onCleanup(() => document.removeEventListener("visibilitychange", onFocus));
  });

  const [restoring, setRestoring] = createSignal(false);

  createEffect(() => {
    void refreshPoints(props.relationship.id, props.userId);
  });
  usePointsFocusRefresh();

  const balance = () => mySpendable();

  return (
    <div class="dashboard">
      <PairBadge myName={props.displayName} partnerName={partnerNameRes.latest ?? null} />
      <div class="dashboard-head">
        <div>
          <p class="eyebrow">Welcome back, {props.displayName}.</p>
          <p class="balance" aria-live="polite">
            <Show
              when={balance() > 0}
              fallback={<>No hearts to spend yet — they'll gather here.</>}
            >
              You have <strong>{balance()}</strong> {balance() === 1 ? "heart" : "hearts"} to
              spend. <span class="balance-sub">Coupons are coming soon.</span>
            </Show>
          </p>
        </div>
        <PrivacyToggle />
      </div>

      <Show when={restoring()}>
        <div class="card">
          <RecoveryPassword
            mode="restore"
            relationshipId={props.relationship.id}
            onDone={() => {
              setRestoring(false);
              void refreshPoints(props.relationship.id, props.userId);
            }}
          />
          <button type="button" class="quiet small" onClick={() => setRestoring(false)}>
            Cancel
          </button>
        </div>
      </Show>

      <HeartComposer
        relationshipId={props.relationship.id}
        userId={props.userId}
        partnerName={partnerName()}
        hasKey={hasCommentKey() !== false}
        onRestoreKey={() => setRestoring(true)}
      />

      <HeartsFeed
        relationshipId={props.relationship.id}
        userId={props.userId}
        partnerName={partnerName()}
        onRestoreKey={() => setRestoring(true)}
      />
    </div>
  );
}
