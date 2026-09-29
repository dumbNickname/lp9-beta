import type { JSX } from "solid-js";
import { Show } from "solid-js";

interface Props {
  id: string;
  title: string;
  count?: number;
  icon?: JSX.Element;
  hint?: string;
  action?: JSX.Element;
  children: JSX.Element;
}

// Section with a sticky, world-tinted header (PRD-49), so you always know
// where you are while scrolling on mobile.
export default function Section(props: Props) {
  return (
    <section class="wsection" aria-labelledby={props.id}>
      <div class="wsection-head">
        <Show when={props.icon}>
          <span class="wsection-icon" aria-hidden="true">{props.icon}</span>
        </Show>
        <h2 id={props.id} class="wsection-title">
          {props.title}
          <Show when={props.count !== undefined && props.count > 0}>
            <span class="wsection-count">{props.count}</span>
          </Show>
        </h2>
        <Show when={props.action}>
          <span class="wsection-action">{props.action}</span>
        </Show>
      </div>
      <Show when={props.hint}>
        <p class="wsection-hint">{props.hint}</p>
      </Show>
      {props.children}
    </section>
  );
}
