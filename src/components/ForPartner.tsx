import { createSignal, For, Show } from "solid-js";
import { ClaimList } from "~/components/ClaimRow";
import ComingUp from "~/components/ComingUp";
import CouponCard from "~/components/CouponCard";
import Section from "~/components/Section";
import { GiftIcon } from "~/components/Icons";
import type { Coupon, Relationship } from "~/lib/data/types";
import { approve, coupons, decline, retire } from "~/lib/stores/coupons";
import { claims, isOpen, openClaimFor } from "~/lib/stores/claims";

interface Props {
  relationship: Relationship;
  userId: string;
  partnerName: string;
}

// "For {partner}" world (PRD-49): what you give. Claims to fulfil first,
// then their wishes that need your yes, then their full list.
export default function ForPartner(props: Props) {
  const [showRetired, setShowRetired] = createSignal(false);
  const [showPast, setShowPast] = createSignal(false);

  const couponMap = () => new Map(coupons().map((c) => [c.id, c]));
  const theirs = () => coupons().filter((c) => c.giver_id === props.userId);
  const toGive = () => claims().filter((c) => c.deliverer_id === props.userId && isOpen(c));
  const needsYes = () => theirs().filter((c) => c.status === "draft");
  const list = () => theirs().filter((c) => c.status === "approved");
  const retired = () => theirs().filter((c) => c.status === "retired");
  const past = () => claims().filter((c) => c.deliverer_id === props.userId && !isOpen(c)).slice(0, 20);

  const card = (c: Coupon) => (
    <CouponCard
      coupon={c}
      mine={false}
      partnerName={props.partnerName}
      claimed={!!openClaimFor(c.id)}
      onApprove={() => approve(c.id)}
      onDecline={(note) => decline(c.id, note)}
      onRetire={() => retire(c.id)}
    />
  );

  return (
    <div class="world world--theirs">
      <div class="world-main">
        <Show when={toGive().length > 0}>
          <Section
            id="sec-togive"
            title="To give"
            count={toGive().length}
            icon={<span>♥</span>}
            hint={`${props.partnerName} spent hearts on these — plan them, then mark delivered.`}
          >
            <ClaimList claims={toGive()} coupons={couponMap()} userId={props.userId} partnerName={props.partnerName} />
          </Section>
        </Show>

        <Show when={needsYes().length > 0}>
          <Section
            id="sec-needsyes"
            title="Needs your yes"
            count={needsYes().length}
            icon={<span>?</span>}
            hint="Talk it over. Say yes, or gently pass."
          >
            <ul class="coupon-list">
              <For each={needsYes()}>{card}</For>
            </ul>
          </Section>
        </Show>

        <Section
          id="sec-theirlist"
          title={`${props.partnerName}'s wishes`}
          count={list().length}
          icon={<span>✦</span>}
        >
          <Show
            when={list().length > 0}
            fallback={
              <div class="empty-state empty-state--small">
                <span class="empty-art" aria-hidden="true">
                  <GiftIcon />
                </span>
                <p class="feed-empty-small">
                  No wishes from {props.partnerName} yet. You'll say yes (or gently
                  pass) here.
                </p>
              </div>
            }
          >
            <ul class="coupon-list">
              <For each={list()}>{card}</For>
            </ul>
          </Show>
        </Section>

        <div class="coupons-more">
          <Show when={past().length > 0}>
            <button type="button" class="link-button" onClick={() => setShowPast((v) => !v)}>
              {showPast() ? "Hide given" : "Given before"}
            </button>
          </Show>
          <Show when={retired().length > 0}>
            <button type="button" class="link-button" onClick={() => setShowRetired((v) => !v)}>
              {showRetired() ? "Hide retired" : "Retired"}
            </button>
          </Show>
        </div>
        <Show when={showPast()}>
          <Section id="sec-given" title="Given before" icon={<span>↺</span>}>
            <ClaimList claims={past()} coupons={couponMap()} userId={props.userId} partnerName={props.partnerName} />
          </Section>
        </Show>
        <Show when={showRetired()}>
          <Section id="sec-retired" title="Retired" icon={<span>○</span>}>
            <ul class="coupon-list">
              <For each={retired()}>{card}</For>
            </ul>
          </Section>
        </Show>
      </div>

      <aside class="world-side">
        <ComingUp
          claims={claims()}
          coupons={couponMap()}
          userId={props.userId}
          partnerName={props.partnerName}
        />
      </aside>
    </div>
  );
}
