import { createEffect, createSignal, For, Show } from "solid-js";
import CouponCard from "~/components/CouponCard";
import CouponForm from "~/components/CouponForm";
import TemplatePicker from "~/components/TemplatePicker";
import type { CouponTemplate } from "~/data/coupon-templates";
import type { Coupon, CouponInput, Relationship } from "~/lib/data/types";
import {
  addCoupon,
  approve,
  coupons,
  couponsError,
  couponsLoading,
  decline,
  editCoupon,
  refreshCoupons,
  removeCoupon,
  retire,
} from "~/lib/stores/coupons";

interface Props {
  relationship: Relationship;
  userId: string;
  partnerName: string;
}

const ORDER: Record<Coupon["status"], number> = { draft: 0, approved: 1, declined: 2, retired: 3 };
const byStatus = (a: Coupon, b: Coupon) => ORDER[a.status] - ORDER[b.status];

export default function CouponsView(props: Props) {
  const [adding, setAdding] = createSignal(false);
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [showIdeas, setShowIdeas] = createSignal(false);
  const [showRetired, setShowRetired] = createSignal(false);

  createEffect(() => {
    void refreshCoupons(props.relationship.id);
  });

  const visible = (c: Coupon) => showRetired() || c.status !== "retired";
  const mine = () => coupons().filter((c) => c.receiver_id === props.userId).sort(byStatus);
  const theirs = () =>
    coupons()
      .filter((c) => c.giver_id === props.userId && c.status !== "declined")
      .sort(byStatus);
  const waitingOnMe = () => theirs().filter((c) => c.status === "draft").length;
  const hasRetired = () => coupons().some((c) => c.status === "retired");
  const myKeys = () => new Set(mine().map((c) => c.template_key).filter((k): k is string => !!k));
  const mineActive = () => mine().filter((c) => c.status !== "retired");

  const createWish = async (input: CouponInput) => {
    await addCoupon(props.relationship.id, input);
    setAdding(false);
  };
  const saveEdit = async (id: string, input: CouponInput) => {
    await editCoupon(id, input);
    setEditingId(null);
  };
  const addTemplates = async (ts: CouponTemplate[]) => {
    for (const t of ts) {
      await addCoupon(
        props.relationship.id,
        { title: t.title, emoji: t.emoji, price: t.price, boundaries_note: t.boundaries ?? null },
        t.key,
      );
    }
    setShowIdeas(false);
  };

  return (
    <div class="coupons-view">
      <Show when={couponsError()}>
        <p class="error" role="alert">Couldn't load coupons. Try refreshing.</p>
      </Show>

      <section class="coupon-section" aria-labelledby="theirs-title">
        <div class="feed-head">
          <h2 id="theirs-title" class="feed-title">
            {props.partnerName} would love
          </h2>
          <Show when={waitingOnMe() > 0}>
            <span class="chip chip--draft">{waitingOnMe()} waiting for you</span>
          </Show>
        </div>
        <Show
          when={theirs().filter(visible).length > 0}
          fallback={
            <p class="feed-empty-small">
              Nothing on {props.partnerName}'s list yet. When they add something,
              you'll say yes (or gently pass) here.
            </p>
          }
        >
          <ul class="coupon-list">
            <For each={theirs().filter(visible)}>
              {(c) => (
                <CouponCard
                  coupon={c}
                  mine={false}
                  partnerName={props.partnerName}
                  onApprove={() => approve(c.id)}
                  onDecline={(note) => decline(c.id, note)}
                  onRetire={() => retire(c.id)}
                />
              )}
            </For>
          </ul>
        </Show>
      </section>

      <section class="coupon-section" aria-labelledby="mine-title">
        <div class="feed-head">
          <h2 id="mine-title" class="feed-title">I'd love</h2>
          <Show when={!adding()}>
            <button type="button" class="small" onClick={() => setAdding(true)}>
              Add a wish
            </button>
          </Show>
        </div>

        <Show when={adding()}>
          <CouponForm
            partnerName={props.partnerName}
            submitLabel={`Ask ${props.partnerName}`}
            onSubmit={createWish}
            onCancel={() => setAdding(false)}
          />
        </Show>

        <Show when={mineActive().length === 0 || showIdeas()}>
          <TemplatePicker
            archetype={props.relationship.archetype}
            existingKeys={myKeys()}
            onAdd={addTemplates}
            onClose={mineActive().length > 0 ? () => setShowIdeas(false) : undefined}
          />
        </Show>

        <ul class="coupon-list">
          <For each={mine().filter(visible)}>
            {(c) => (
              <Show
                when={editingId() !== c.id}
                fallback={
                  <li>
                    <CouponForm
                      partnerName={props.partnerName}
                      initial={c}
                      submitLabel="Save"
                      onSubmit={(input) => saveEdit(c.id, input)}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                }
              >
                <CouponCard
                  coupon={c}
                  mine
                  partnerName={props.partnerName}
                  onEdit={() => setEditingId(c.id)}
                  onDelete={() => removeCoupon(c.id)}
                  onRetire={() => retire(c.id)}
                />
              </Show>
            )}
          </For>
        </ul>

        <div class="coupons-more">
          <Show when={mineActive().length > 0 && !showIdeas()}>
            <button type="button" class="link-button" onClick={() => setShowIdeas(true)}>
              Need ideas?
            </button>
          </Show>
          <Show when={hasRetired()}>
            <button type="button" class="link-button" onClick={() => setShowRetired((v) => !v)}>
              {showRetired() ? "Hide retired" : "Show retired"}
            </button>
          </Show>
          <button
            type="button"
            class="link-button"
            onClick={() => void refreshCoupons(props.relationship.id)}
            disabled={couponsLoading()}
          >
            {couponsLoading() ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </section>
    </div>
  );
}
