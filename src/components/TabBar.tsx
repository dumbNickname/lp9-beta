import { For, Show } from "solid-js";
import HeartIcon from "~/components/HeartIcon";
import { GiftIcon, SparkIcon } from "~/components/Icons";

export type Tab = "give" | "mine" | "theirs";
const TABS: Tab[] = ["give", "mine", "theirs"];

// `#settings` / `#guide` are separate pages inside the dashboard (PRD-51).
export type Page = "settings" | "guide";
export function readPage(): Page | null {
  if (typeof window === "undefined") return null;
  const h = window.location.hash;
  return h === "#settings" ? "settings" : h === "#guide" ? "guide" : null;
}

// Hash sync (D-39.1, PRD-49). Legacy `#coupons` opens My wishes.
export function readTab(): Tab {
  if (typeof window === "undefined") return "give";
  const h = window.location.hash.slice(1);
  if (h === "mine" || h === "coupons") return "mine";
  if (h === "theirs") return "theirs";
  return "give";
}

// Absolute URL: a bare "#x" would resolve against <base href> and drop
// /app (see src/AGENTS.md gotcha).
export function writeTab(t: Tab | Page): void {
  try {
    const path = location.pathname + location.search;
    history.replaceState(null, "", t === "give" ? path : `${path}#${t}`);
  } catch {
    // history unavailable (tests/SSR)
  }
}

interface Props {
  tab: Tab;
  onSelect: (t: Tab) => void;
  partnerName: string;
  mineBadge: number;
  theirsBadge: number;
}

export default function TabBar(props: Props) {
  const label = (t: Tab) =>
    t === "give" ? "Give" : t === "mine" ? "My wishes" : `For ${props.partnerName}`;
  const badge = (t: Tab) => (t === "mine" ? props.mineBadge : t === "theirs" ? props.theirsBadge : 0);

  const onKey = (e: KeyboardEvent) => {
    const i = TABS.indexOf(props.tab);
    let n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % TABS.length;
    if (e.key === "ArrowLeft") n = (i + TABS.length - 1) % TABS.length;
    if (n < 0) return;
    e.preventDefault();
    props.onSelect(TABS[n]!);
    document.getElementById(`tab-${TABS[n]}`)?.focus();
  };

  return (
    <nav class="tabbar" aria-label="Sections">
      <div class="tabbar-inner" role="tablist">
        <For each={TABS}>
          {(t) => (
            <button
              id={`tab-${t}`}
              type="button"
              role="tab"
              class={`tabbar-tab tabbar-tab--${t}`}
              aria-selected={props.tab === t}
              aria-controls={`panel-${t}`}
              tabIndex={props.tab === t ? 0 : -1}
              onClick={() => props.onSelect(t)}
              onKeyDown={onKey}
            >
              <span class="tabbar-icon" aria-hidden="true">
                {t === "give" ? <HeartIcon filled /> : t === "mine" ? <SparkIcon /> : <GiftIcon />}
              </span>
              <span class="tabbar-label">{label(t)}</span>
              <Show when={badge(t) > 0}>
                <span class="tab-badge" aria-label={`${badge(t)} waiting`}>
                  {badge(t)}
                </span>
              </Show>
            </button>
          )}
        </For>
      </div>
    </nav>
  );
}
