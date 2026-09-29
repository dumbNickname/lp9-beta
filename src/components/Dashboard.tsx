import { createEffect, createResource, createSignal, Show } from "solid-js";
import HeartComposer from "~/components/HeartComposer";
import HeartsFeed from "~/components/HeartsFeed";
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
  const [partnerNameRes] = createResource(partnerId, (id) =>
    getDisplayName(id).catch(() => null),
  );
  const partnerName = () => partnerNameRes() || "your partner";

  const [restoring, setRestoring] = createSignal(false);

  createEffect(() => {
    void refreshPoints(props.relationship.id, props.userId);
  });
  usePointsFocusRefresh();

  const balance = () => mySpendable();

  return (
    <div class="dashboard">
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
