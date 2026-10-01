import { createEffect, createResource, createSignal, onCleanup, onMount, Show } from "solid-js";
import AppBar from "~/components/AppBar";
import ForPartner from "~/components/ForPartner";
import HeartComposer from "~/components/HeartComposer";
import HeartsFeed from "~/components/HeartsFeed";
import MyWishes from "~/components/MyWishes";
import PairBadge from "~/components/PairBadge";
import RecoveryPassword from "~/components/RecoveryPassword";
import SettingsPage from "~/components/SettingsPage";
import TabBar, { type Tab, readSettings, readTab, writeTab } from "~/components/TabBar";
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
  feed,
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

  // Tabs synced to location.hash (D-39.1, PRD-49). `#pair=` deep links are
  // consumed by PairFlow before the dashboard ever mounts.
  const [tab, setTab] = createSignal<Tab>(readTab());
  const selectTab = (t: Tab) => {
    setSettings(false);
    setTab(t);
    writeTab(t);
    if (t !== "give") {
      refreshCurrentCoupons();
      void refreshClaims(props.relationship.id);
    }
    if (typeof window !== "undefined") window.scrollTo?.({ top: 0 });
  };
  const [editingName, setEditingName] = createSignal(false);
  const [settings, setSettings] = createSignal(readSettings());
  const openSettings = () => {
    setSettings(true);
    writeTab("settings");
    if (typeof window !== "undefined") window.scrollTo?.({ top: 0 });
  };
  const closeSettings = () => {
    setSettings(false);
    writeTab(tab());
  };
  onMount(() => {
    const onHash = () => {
      setSettings(readSettings());
      if (!readSettings()) setTab(readTab());
    };
    const onFocus = () => {
      if (document.visibilityState !== "visible") return;
      void refreshClaims(props.relationship.id);
      if (tab() !== "give") refreshCurrentCoupons();
    };
    window.addEventListener("hashchange", onHash);
    document.addEventListener("visibilitychange", onFocus);
    onCleanup(() => {
      window.removeEventListener("hashchange", onHash);
      document.removeEventListener("visibilitychange", onFocus);
    });
  });
  const greeting = () => {
    const h = new Date().getHours();
    return h < 5 ? "Hello" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  };
  const myWaiting = () =>
    claims().filter((c) => c.claimer_id === props.userId && c.status === "accepted").length;

  return (
    <div class="dashboard" classList={{ [`dashboard--${tab()}`]: true }}>
      <AppBar
        myName={props.displayName}
        partnerName={partnerName()}
        pairs={pairs()}
        currentId={props.relationship.id}
        balance={balance()}
        escrow={escrow()}
        onSwitch={(id) => selectRelationship(id)}
        onNewPair={() => setAddingPartner(true)}
        onEditName={() => setEditingName(true)}
        onOpenSettings={openSettings}
        privacyHint={feed().some((f) => !!f.comment)}
      />

      <Show when={settings()}>
        <SettingsPage
          myName={props.displayName}
          partnerName={partnerNameRes.latest ?? null}
          relationshipId={props.relationship.id}
          onBack={closeSettings}
          onNewPair={() => setAddingPartner(true)}
        />
      </Show>

      <TabBar
        tab={settings() ? ("none" as Tab) : tab()}
        onSelect={selectTab}
        partnerName={partnerName()}
        mineBadge={myWaiting()}
        theirsBadge={waitingOnMe()}
      />

      <Show when={editingName()}>
        <div class="card">
          <PairBadge
            myName={props.displayName}
            partnerName={partnerNameRes.latest ?? null}
            startEditing
            onDone={() => setEditingName(false)}
          />
        </div>
      </Show>

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

      <Show when={!settings() && tab() === "give"}>
        <div id="panel-give" role="tabpanel" aria-labelledby="tab-give" class="world world--give">
          <div class="world-main">
            <p class="eyebrow greeting">
              {greeting()}, {props.displayName}.
            </p>
            <HeartComposer
              relationshipId={props.relationship.id}
              userId={props.userId}
              partnerName={partnerName()}
              hasKey={hasCommentKey() !== false}
              onRestoreKey={() => setRestoring(true)}
            />
          </div>
          <div class="world-side">
            <HeartsFeed
              relationshipId={props.relationship.id}
              userId={props.userId}
              partnerName={partnerName()}
              onRestoreKey={() => setRestoring(true)}
            />
          </div>
        </div>
      </Show>

      <Show when={!settings() && tab() === "mine"}>
        <div id="panel-mine" role="tabpanel" aria-labelledby="tab-mine">
          <MyWishes
            relationship={props.relationship}
            userId={props.userId}
            partnerName={partnerName()}
            balance={balance()}
          />
        </div>
      </Show>

      <Show when={!settings() && tab() === "theirs"}>
        <div id="panel-theirs" role="tabpanel" aria-labelledby="tab-theirs">
          <ForPartner
            relationship={props.relationship}
            userId={props.userId}
            partnerName={partnerName()}
          />
        </div>
      </Show>
    </div>
  );
}
