import { createSignal, For, Show } from "solid-js";
import { ARCHETYPE_LABELS, TEMPLATES, type CouponTemplate } from "~/data/coupon-templates";
import { friendlyCouponError } from "~/lib/data/coupons";
import type { Archetype } from "~/lib/data/types";

const ARCHETYPES = Object.keys(TEMPLATES) as Archetype[];

interface Props {
  archetype: Archetype;
  existingKeys: Set<string>;
  onAdd: (templates: CouponTemplate[]) => Promise<void>;
  onClose?: () => void;
}

export default function TemplatePicker(props: Props) {
  // eslint-disable-next-line solid/reactivity -- initial tab only
  const [tab, setTab] = createSignal<Archetype>(props.archetype);
  const [picked, setPicked] = createSignal<Set<string>>(new Set());
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  const visible = () => TEMPLATES[tab()].filter((t) => !props.existingKeys.has(t.key));
  const all = () => ARCHETYPES.flatMap((a) => TEMPLATES[a]);

  const toggle = (key: string) => {
    const next = new Set(picked());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setPicked(next);
  };

  const add = async () => {
    const chosen = all().filter((t) => picked().has(t.key));
    if (chosen.length === 0) return;
    setBusy(true);
    setError("");
    try {
      await props.onAdd(chosen);
      setPicked(new Set<string>());
    } catch (err) {
      setError(friendlyCouponError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section class="card templates" aria-labelledby="templates-title">
      <h3 id="templates-title" class="templates-title">Need ideas?</h3>
      <p class="templates-sub">
        Tick a few to start your list. Each one still needs a yes from your partner,
        and you can edit them first.
      </p>
      <div class="segmented" role="tablist" aria-label="Idea sets">
        <For each={ARCHETYPES}>
          {(a) => (
            <button
              type="button"
              role="tab"
              class="segmented-option"
              aria-selected={tab() === a}
              onClick={() => setTab(a)}
            >
              {ARCHETYPE_LABELS[a]}
            </button>
          )}
        </For>
      </div>
      <ul class="template-list">
        <For each={visible()} fallback={<li class="feed-empty">All of these are on your list.</li>}>
          {(t) => (
            <li>
              <label class="template-item" classList={{ "is-on": picked().has(t.key) }}>
                <input
                  type="checkbox"
                  checked={picked().has(t.key)}
                  onChange={() => toggle(t.key)}
                  disabled={busy()}
                />
                <span class="coupon-emoji" aria-hidden="true">{t.emoji}</span>
                <span class="template-title">{t.title}</span>
                <span class="template-price">{t.price}</span>
              </label>
            </li>
          )}
        </For>
      </ul>
      <Show when={error()}>
        <p class="error" role="alert">{error()}</p>
      </Show>
      <div class="composer-actions">
        <button type="button" onClick={() => void add()} disabled={busy() || picked().size === 0}>
          {busy()
            ? "Adding..."
            : picked().size > 0
              ? `Add ${picked().size} to my list`
              : "Add to my list"}
        </button>
        <Show when={props.onClose}>
          <button type="button" class="quiet" onClick={() => props.onClose?.()} disabled={busy()}>
            Close
          </button>
        </Show>
      </div>
    </section>
  );
}
