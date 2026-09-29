import { createSignal, For, Show } from "solid-js";
import { ClaimList } from "~/components/ClaimRow";
import ComingUp from "~/components/ComingUp";
import CouponCard from "~/components/CouponCard";
import CouponForm from "~/components/CouponForm";
import Section from "~/components/Section";
import TemplatePicker from "~/components/TemplatePicker";
import type { CouponTemplate } from "~/data/coupon-templates";
import type { Coupon, CouponInput, Relationship } from "~/lib/data/types";
import { addCoupon, coupons, editCoupon, removeCoupon, retire } from "~/lib/stores/coupons";
import { claim, claims, isOpen, openClaimFor } from "~/lib/stores/claims";

interface Props {
  relationship: Relationship;
  userId: string;
  partnerName: string;
  balance: number;
}

// "My wishes" world (PRD-49): collect + spend. Grouped by what you can do.
export default function MyWishes(props: Props) {
  // Desktop has room: open the "add a wish" form by default (owner
  // 2026-09-29). Mobile keeps it collapsed.
  const isWide = () => {
    try {
      return window.matchMedia("(min-width: 56rem)").matches;
    } catch {
      return false;
    }
  };
  const [adding, setAdding] = createSignal(isWide());
  const [editingId, setEditingId] = createSignal<string | null>(null);
  const [showIdeas, setShowIdeas] = createSignal(false);
  const [showPast, setShowPast] = createSignal(false);

  const mine = () => coupons().filter((c) => c.receiver_id === props.userId);
  const couponMap = () => new Map(coupons().map((c) => [c.id, c]));
  const approvedFree = () => mine().filter((c) => c.status === "approved" && !openClaimFor(c.id));
  const ready = () =>
    approvedFree()
      .filter((c) => c.price <= props.balance)
      .sort((a, b) => b.price - a.price);
  const saving = () =>
    approvedFree()
      .filter((c) => c.price > props.balance)
      .sort((a, b) => a.price - b.price);
  const waiting = () => mine().filter((c) => c.status === "draft");
  const declined = () => mine().filter((c) => c.status === "declined");
  const myOpen = () => claims().filter((c) => c.claimer_id === props.userId && isOpen(c));
  const past = () => claims().filter((c) => c.claimer_id === props.userId && !isOpen(c)).slice(0, 20);
  const active = () => mine().filter((c) => c.status !== "retired");
  const myKeys = () => new Set(mine().map((c) => c.template_key).filter((k): k is string => !!k));

  const claimIt = async (id: string) => {
    await claim(id);
  };
  // Bumped after each submit so the form remounts empty.
  const [formKey, setFormKey] = createSignal(1);
  const createWish = async (input: CouponInput) => {
    await addCoupon(props.relationship.id, input);
    if (isWide()) setFormKey((k) => k + 1);
    else setAdding(false);
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

  const card = (c: Coupon) => (
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
        affordable={c.status === "approved" && c.price <= props.balance}
        short={c.status === "approved" ? Math.max(0, c.price - props.balance) : 0}
        claimed={!!openClaimFor(c.id)}
        onClaim={() => claimIt(c.id)}
        onEdit={() => setEditingId(c.id)}
        onDelete={() => removeCoupon(c.id)}
        onRetire={() => retire(c.id)}
      />
    </Show>
  );

  const addButton = (
    <Show when={!adding()}>
      <button type="button" class="small" onClick={() => setAdding(true)}>
        + Add a wish
      </button>
    </Show>
  );

  return (
    <div class="world world--mine">
      <div class="world-main">
        <Show when={adding() && formKey()} keyed>
          <div class="add-wish">
            <h2 class="add-wish-title">Add a wish</h2>
            <CouponForm
              partnerName={props.partnerName}
              submitLabel={`Ask ${props.partnerName}`}
              onSubmit={createWish}
              onCancel={() => setAdding(false)}
            />
          </div>
        </Show>

        <Show when={active().length === 0 || showIdeas()}>
          <TemplatePicker
            archetype={props.relationship.archetype}
            existingKeys={myKeys()}
            onAdd={addTemplates}
            onClose={active().length > 0 ? () => setShowIdeas(false) : undefined}
          />
        </Show>

        <Show when={ready().length > 0}>
          <Section
            id="sec-ready"
            title="Ready to claim"
            count={ready().length}
            icon={<span>✦</span>}
            hint="You have enough hearts for these."
            action={addButton}
          >
            <ul class="coupon-list">
              <For each={ready()}>{card}</For>
            </ul>
          </Section>
        </Show>

        <Show when={saving().length > 0}>
          <Section
            id="sec-saving"
            title="Saving up"
            count={saving().length}
            icon={<span>◔</span>}
            action={ready().length === 0 ? addButton : undefined}
          >
            <ul class="coupon-list">
              <For each={saving()}>{card}</For>
            </ul>
          </Section>
        </Show>

        <Show when={waiting().length > 0}>
          <Section
            id="sec-waiting"
            title={`Waiting for ${props.partnerName}'s yes`}
            count={waiting().length}
            icon={<span>…</span>}
            action={ready().length === 0 && saving().length === 0 ? addButton : undefined}
          >
            <ul class="coupon-list">
              <For each={waiting()}>{card}</For>
            </ul>
          </Section>
        </Show>

        <Show when={declined().length > 0}>
          <Section id="sec-declined" title={`Not for ${props.partnerName}`} icon={<span>○</span>}>
            <ul class="coupon-list">
              <For each={declined()}>{card}</For>
            </ul>
          </Section>
        </Show>

        <Show when={ready().length + saving().length + waiting().length === 0}>
          <div class="world-empty-action">{addButton}</div>
        </Show>

        <div class="coupons-more">
          <Show when={active().length > 0 && !showIdeas()}>
            <button type="button" class="link-button" onClick={() => setShowIdeas(true)}>
              Need ideas?
            </button>
          </Show>
          <Show when={past().length > 0}>
            <button type="button" class="link-button" onClick={() => setShowPast((v) => !v)}>
              {showPast() ? "Hide past claims" : "Past claims"}
            </button>
          </Show>
        </div>
        <Show when={showPast()}>
          <Section id="sec-past" title="Past claims" icon={<span>↺</span>}>
            <ClaimList claims={past()} coupons={couponMap()} userId={props.userId} partnerName={props.partnerName} />
          </Section>
        </Show>
      </div>

      <aside class="world-side">
        <Show when={myOpen().length > 0}>
          <Section id="sec-inprogress" title="In progress" count={myOpen().length} icon={<span>➜</span>}>
            <ClaimList claims={myOpen()} coupons={couponMap()} userId={props.userId} partnerName={props.partnerName} />
          </Section>
        </Show>
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
