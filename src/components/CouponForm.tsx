import { createSignal, Show } from "solid-js";
import { PRICE_MAX, PRICE_MIN, TEXT_MAX, TITLE_MAX, friendlyCouponError } from "~/lib/data/coupons";
import type { CouponInput } from "~/lib/data/types";

interface Props {
  partnerName: string;
  initial?: CouponInput;
  submitLabel: string;
  onSubmit: (input: CouponInput) => Promise<void>;
  onCancel: () => void;
}

export default function CouponForm(props: Props) {
  const init = props.initial;
  const [emoji, setEmoji] = createSignal(init?.emoji ?? "");
  const [title, setTitle] = createSignal(init?.title ?? "");
  const [price, setPrice] = createSignal(init?.price ?? 5);
  const [description, setDescription] = createSignal(init?.description ?? "");
  const [boundaries, setBoundaries] = createSignal(init?.boundaries_note ?? "");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  const clampPrice = (n: number) =>
    Math.min(PRICE_MAX, Math.max(PRICE_MIN, Math.round(Number.isFinite(n) ? n : PRICE_MIN)));

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!title().trim()) {
      setError("Give it a title.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await props.onSubmit({
        title: title().trim(),
        emoji: emoji().trim() || null,
        price: clampPrice(price()),
        description: description().trim() || null,
        boundaries_note: boundaries().trim() || null,
      });
    } catch (err) {
      setError(friendlyCouponError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form class="card coupon-form" onSubmit={submit}>
      <div class="coupon-form-row">
        <label class="coupon-form-emoji">
          Icon
          <input
            type="text"
            value={emoji()}
            maxLength={4}
            placeholder="🎁"
            onInput={(e) => setEmoji(e.currentTarget.value)}
            disabled={busy()}
          />
        </label>
        <label class="coupon-form-title">
          What would you love?
          <input
            type="text"
            value={title()}
            maxLength={TITLE_MAX}
            placeholder="Breakfast in bed"
            onInput={(e) => setTitle(e.currentTarget.value)}
            disabled={busy()}
            required
          />
        </label>
      </div>

      <div class="price-stepper" role="group" aria-label="Price in hearts">
        <span class="price-label">Price</span>
        <button
          type="button"
          class="quiet small"
          aria-label="Fewer hearts"
          onClick={() => setPrice((p) => clampPrice(p - 1))}
          disabled={busy() || price() <= PRICE_MIN}
        >
          −
        </button>
        <input
          type="number"
          inputmode="numeric"
          min={PRICE_MIN}
          max={PRICE_MAX}
          value={price()}
          aria-label="Hearts"
          onInput={(e) => setPrice(clampPrice(e.currentTarget.valueAsNumber))}
          disabled={busy()}
        />
        <button
          type="button"
          class="quiet small"
          aria-label="More hearts"
          onClick={() => setPrice((p) => clampPrice(p + 1))}
          disabled={busy() || price() >= PRICE_MAX}
        >
          +
        </button>
        <span class="price-unit">hearts</span>
      </div>

      <label>
        A few words (optional)
        <textarea
          rows={2}
          maxLength={TEXT_MAX}
          value={description()}
          onInput={(e) => setDescription(e.currentTarget.value)}
          disabled={busy()}
        />
      </label>

      <label>
        Boundaries you agreed (optional)
        <textarea
          rows={2}
          maxLength={TEXT_MAX}
          value={boundaries()}
          placeholder="e.g. weekends only, 30 minutes max"
          onInput={(e) => setBoundaries(e.currentTarget.value)}
          disabled={busy()}
        />
      </label>
      <p class="coupon-form-hint">
        Talk about it with {props.partnerName}. Boundaries can move over time
        as you both feel more comfortable — what feels good? What's a hard no?
        Once {props.partnerName} says yes, the price is fixed.
      </p>

      <Show when={error()}>
        <p class="error" role="alert">{error()}</p>
      </Show>
      <div class="composer-actions">
        <button type="submit" disabled={busy()}>
          {busy() ? "Saving..." : props.submitLabel}
        </button>
        <button type="button" class="quiet" onClick={() => props.onCancel()} disabled={busy()}>
          Cancel
        </button>
      </div>
    </form>
  );
}
