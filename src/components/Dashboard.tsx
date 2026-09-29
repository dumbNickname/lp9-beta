import { createEffect, createResource, createSignal, onCleanup, onMount, Show } from "solid-js";
import CouponsView from "~/components/CouponsView";
import HeartComposer from "~/components/HeartComposer";
import HeartsFeed from "~/components/HeartsFeed";
import PairBadge from "~/components/PairBadge";
import PrivacyToggle from "~/components/PrivacyToggle";
import RecoveryPassword from "~/components/RecoveryPassword";
import { getDisplayName } from "~/lib/data/profile";
import type { Relationship } from "~/lib/data/types";
import {
  relationships,
  selectRelationship,
  setAddingPartner,
} from "~/lib/stores/relationship";
import { coupons, refreshCoupons, refreshCurrentCoupons, resetCoupons } from "~/lib/stores/coupons";
import { claims, myEscrow, refreshClaims, resetClaims } from "~/lib/stores/claims";
import {
  hasCommentKey,
  mySpendable,
  refreshPoints,
  resetPoints,
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

  // Names for every pair on this account (switcher, PRD-43).
  const [pairNames] = createResource(
    () => ({
      pairs: relationships().map((r) => ({
        id: r.id,
        other: r.member_a === props.userId ? r.member_b : r.member_a,
      })),
      tick: partnerTick(),
    }),
    async ({ pairs }) => {
      const entries = await Promise.all(
        pairs.map(async (p) => {
          const n = await getDisplayName(p.other).catch(() => null);
          return [p.id, n || "Someone"] as const;
        }),
      );
      return new Map(entries);
    },
  );
  const pairs = () =>
    relationships().map((r) => ({ id: r.id, partnerName: pairNames.latest?.get(r.id) ?? "…" }));
  onMount(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") setPartnerTick((t) => t + 1);
    };
    document.addEventListener("visibilitychange", onFocus);
    onCleanup(() => document.removeEventListener("visibilitychange", onFocus));
  });

  const [restoring, setRestoring] = createSignal(false);

  // Mounted fresh per relationship (keyed in routes/app.tsx): clear the
  // previous pair's module-level store data before fetching (PRD-43).
  resetPoints();
  resetCoupons();
  resetClaims();

  createEffect(() => {
    void refreshPoints(props.relationship.id, props.userId);
    void refreshClaims(props.relationship.id);
    void refreshCoupons(props.relationship.id);
  });

  // Things waiting on me: drafts to approve + claims to answer/deliver.
  const waitingOnMe = () =>
    coupons().filter((c) => c.giver_id === props.userId && c.status === "draft").length +
    claims().filter(
      (c) => c.deliverer_id === props.userId && (c.status === "pending" || c.status === "accepted"),
    ).length;
  usePointsFocusRefresh();

  const balance = () => mySpendable(props.userId);
  const escrow = () => myEscrow(props.userId);

  // Tabs synced to location.hash (D-39.1). `#pair=` deep links are consumed
  // by PairFlow before the dashboard ever mounts.
  type Tab = "notes" | "coupons";
  const readTab = (): Tab =>
    typeof window !== "undefined" && window.location.hash === "#coupons" ? "coupons" : "notes";
  const [tab, setTab] = createSignal<Tab>(readTab());
  const selectTab = (t: Tab) => {
    setTab(t);
    try {
      // Absolute path: a bare "#coupons" would resolve against <base href>
      // (the site root) and drop /app from the URL.
      const path = location.pathname + location.search;
      history.replaceState(null, "", t === "notes" ? path : `${path}#coupons`);
    } catch {
      // history unavailable (tests/SSR)
    }
  };
  onMount(() => {
    const onHash = () => setTab(readTab());
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      void refreshClaims(props.relationship.id);
      if (tab() === "coupons") refreshCurrentCoupons();
    };
    window.addEventListener("hashchange", onHash);
    document.addEventListener("visibilitychange", onFocus);
    onCleanup(() => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("visibilitychange", onFocus);
    });
  });
  const onTabKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const next: Tab = tab() === "notes" ? "coupons" : "notes";
      selectTab(next);
      document.getElementById(`tab-${next}`)?.focus();
    }
  };

  return (
    <div class="dashboard">
      <PairBadge
        myName={props.displayName}
        partnerName={partnerNameRes.latest ?? null}
        pairs={pairs()}
        currentId={props.relationship.id}
        onSwitch={(id) => selectRelationship(id)}
        onAddPartner={() => setAddingPartner(true)}
      />
      <div class="dashboard-head">
        <div>
          <p class="eyebrow">Welcome back, {props.displayName}.</p>
          <p class="balance" aria-live="polite">
            <Show
              when={balance() > 0}
              fallback={
                <Show when={escrow() > 0} fallback={<>No hearts to spend yet — they'll gather here.</>}>
                  All your hearts are set aside for a claim.
                </Show>
              }
            >
              You have <strong>{balance()}</strong> {balance() === 1 ? "heart" : "hearts"} to
              spend.
            </Show>
            <Show when={escrow() > 0}>
              <span class="balance-sub">{escrow()} set aside for claims</span>
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

      <div class="tabs" role="tablist" aria-label="Sections">
        <button
          id="tab-notes"
          type="button"
          role="tab"
          class="tab"
          aria-selected={tab() === "notes"}
          aria-controls="panel-notes"
          tabIndex={tab() === "notes" ? 0 : -1}
          onClick={() => selectTab("notes")}
          onKeyDown={onTabKey}
        >
          Notes
        </button>
        <button
          id="tab-coupons"
          type="button"
          role="tab"
          class="tab"
          aria-selected={tab() === "coupons"}
          aria-controls="panel-coupons"
          tabIndex={tab() === "coupons" ? 0 : -1}
          onClick={() => selectTab("coupons")}
          onKeyDown={onTabKey}
        >
          Coupons
          <Show when={waitingOnMe() > 0}>
            <span class="tab-badge" aria-label={`${waitingOnMe()} waiting for you`}>
              {waitingOnMe()}
            </span>
          </Show>
        </button>
      </div>

      <Show when={tab() === "notes"}>
        <div id="panel-notes" role="tabpanel" aria-labelledby="tab-notes">
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
      </Show>

      <Show when={tab() === "coupons"}>
        <div id="panel-coupons" role="tabpanel" aria-labelledby="tab-coupons">
          <CouponsView
            relationship={props.relationship}
            userId={props.userId}
            partnerName={partnerName()}
            balance={balance()}
          />
        </div>
      </Show>
    </div>
  );
}
