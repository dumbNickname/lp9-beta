import { type JSX, Show } from "solid-js";

interface Props {
  // "warning" for honest loss/risk copy; "info" for neutral asides.
  variant?: "warning" | "info";
  // Optional short heading rendered above the body.
  title?: string;
  children: JSX.Element;
}

// Presentational, non-blocking callout. Uses role="note" so it is exposed
// to assistive tech without stealing focus like an alert would. Colors come
// only from semantic theme tokens (see src/styles/global.css .callout*), so
// it renders correctly in light and dark.
export default function Callout(props: Props) {
  const variant = () => props.variant ?? "warning";
  return (
    <div class={`callout callout--${variant()}`} role="note">
      <Show when={props.title}>
        <p class="callout-title">{props.title}</p>
      </Show>
      <div class="callout-body">{props.children}</div>
    </div>
  );
}
