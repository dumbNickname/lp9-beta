import { For } from "solid-js";
import HeartIcon from "~/components/HeartIcon";
import type { HeartAmount } from "~/lib/data/types";

const AMOUNTS: HeartAmount[] = [1, 2, 3, 4, 5];

interface Props {
  value: HeartAmount | null;
  onChange: (v: HeartAmount) => void;
  disabled?: boolean;
}

// Radiogroup with roving tabindex: arrow keys move + select, like native
// radios. Hovering previews the fill.
export default function HeartPicker(props: Props) {
  const refs: HTMLButtonElement[] = [];

  const select = (v: HeartAmount) => {
    props.onChange(v);
    refs[v - 1]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent, v: HeartAmount) => {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(5, v + 1);
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(1, v - 1);
    if (e.key === "Home") next = 1;
    if (e.key === "End") next = 5;
    if (next !== null) {
      e.preventDefault();
      select(next as HeartAmount);
    }
  };

  return (
    <div class="heart-picker" role="radiogroup" aria-label="How many hearts">
      <For each={AMOUNTS}>
        {(n) => (
          <button
            ref={(el) => (refs[n - 1] = el)}
            type="button"
            role="radio"
            class="heart-picker-option"
            classList={{ "is-on": (props.value ?? 0) >= n }}
            aria-checked={props.value === n}
            aria-label={`${n} ${n === 1 ? "heart" : "hearts"}`}
            tabIndex={(props.value ?? 1) === n ? 0 : -1}
            disabled={props.disabled}
            onClick={() => select(n)}
            onKeyDown={(e) => onKeyDown(e, n)}
          >
            <HeartIcon filled={(props.value ?? 0) >= n} />
          </button>
        )}
      </For>
    </div>
  );
}
