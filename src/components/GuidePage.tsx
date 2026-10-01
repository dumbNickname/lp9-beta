import type { JSX } from "solid-js";
import { For } from "solid-js";
import HeartIcon from "~/components/HeartIcon";
import { EyeIcon, GiftIcon, LockIcon, SparkIcon } from "~/components/Icons";

interface Props {
  partnerName: string;
  onBack: () => void;
  onGo: (tab: "give" | "mine" | "theirs") => void;
}

interface Step {
  world: "give" | "mine" | "theirs" | "calm";
  icon: JSX.Element;
  title: string;
  hint: string;
  demo: () => JSX.Element;
  go?: "give" | "mine" | "theirs";
}

// Visual "how it works" (owner request): one card per idea, a tiny mock of
// the real UI, one short line each. No long copy.
export default function GuidePage(props: Props) {
  const steps = (): Step[] => [
    {
      world: "give",
      icon: <HeartIcon filled />,
      title: "Notice. Give hearts.",
      hint: `Caught ${props.partnerName} being lovely? 1–5 hearts and a line.`,
      demo: () => (
        <span class="guide-demo-hearts">
          <For each={[1, 2, 3, 4, 5]}>
            {(n) => (
              <span classList={{ "is-on": n <= 3 }}>
                <HeartIcon filled={n <= 3} />
              </span>
            )}
          </For>
        </span>
      ),
      go: "give",
    },
    {
      world: "mine",
      icon: <SparkIcon />,
      title: "Wish for treats.",
      hint: `Add wishes. ${props.partnerName} says yes or gently passes.`,
      demo: () => (
        <span class="guide-demo-ticket">
          <span class="guide-demo-emoji">🥐</span>
          <span class="guide-demo-title">Breakfast in bed</span>
          <span class="guide-demo-price">
            6 <HeartIcon filled />
          </span>
        </span>
      ),
      go: "mine",
    },
    {
      world: "theirs",
      icon: <GiftIcon />,
      title: "Spend hearts. Make it happen.",
      hint: "Enough hearts? Claim it. They plan it and mark it done.",
      demo: () => (
        <span class="guide-demo-flow">
          <span class="guide-demo-chip">Claim</span>
          <span class="guide-demo-arrow" />
          <span class="guide-demo-chip">Yes + date</span>
          <span class="guide-demo-arrow" />
          <span class="guide-demo-chip guide-demo-chip--done">Done</span>
        </span>
      ),
      go: "theirs",
    },
    {
      world: "calm",
      icon: <EyeIcon closed />,
      title: "Phone in company?",
      hint: "Tap the eye at the top. Notes get veiled until you tap one.",
      demo: () => (
        <span class="guide-demo-veil">
          <LockIcon />
          <span />
          <span />
        </span>
      ),
    },
  ];

  return (
    <div class="guide-page">
      <div class="settings-top">
        <button type="button" class="quiet small settings-back" onClick={() => props.onBack()}>
          ← Back
        </button>
        <h1 class="settings-title">How it works</h1>
      </div>
      <ol class="guide-list">
        <For each={steps()}>
          {(s, i) => (
            <li class={`guide-card guide-card--${s.world}`}>
              <span class="guide-num" aria-hidden="true">{i() + 1}</span>
              <span class="guide-icon" aria-hidden="true">{s.icon}</span>
              <h2 class="guide-title">{s.title}</h2>
              <p class="guide-hint">{s.hint}</p>
              <span class="guide-demo" aria-hidden="true">{s.demo()}</span>
              {s.go && (
                <button type="button" class="link-button guide-go" onClick={() => props.onGo(s.go!)}>
                  Take me there →
                </button>
              )}
            </li>
          )}
        </For>
      </ol>
      <p class="guide-foot">
        <LockIcon /> Notes are end-to-end encrypted. No scores, no streaks.
      </p>
    </div>
  );
}
