import { For } from "solid-js";

interface Props {
  filled?: boolean;
  class?: string;
}

// Hand-drawn-leaning heart; filled vs outline. Decorative (aria-hidden):
// callers provide the accessible label.
export default function HeartIcon(props: Props) {
  return (
    <svg
      class={`heart-icon ${props.filled ? "heart-icon--filled" : ""} ${props.class ?? ""}`}
      viewBox="0 0 24 24"
      aria-hidden="true"
     
    >
      <path d="M12 20.3c-.3 0-.6-.1-.8-.3C7.1 16.6 3.5 13.5 3.5 9.4 3.5 6.9 5.4 5 7.8 5c1.6 0 3.1.8 4.2 2.2C13.1 5.8 14.6 5 16.2 5c2.4 0 4.3 1.9 4.3 4.4 0 4.1-3.6 7.2-7.7 10.6-.2.2-.5.3-.8.3z" />
    </svg>
  );
}

export function HeartRow(props: { amount: number; class?: string }) {
  return (
    <span
      class={`heart-row ${props.class ?? ""}`}
      role="img"
      aria-label={`${props.amount} ${props.amount === 1 ? "heart" : "hearts"}`}
    >
      <For each={Array.from({ length: props.amount }, (_, i) => i)}>
        {() => <HeartIcon filled />}
      </For>
    </span>
  );
}
