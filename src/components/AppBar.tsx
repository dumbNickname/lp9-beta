import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import HeartIcon from "~/components/HeartIcon";
import { initial, type PairOption } from "~/components/PairBadge";
import PrivacyToggle from "~/components/PrivacyToggle";

interface Props {
  myName: string;
  partnerName: string;
  pairs: PairOption[];
  currentId: string;
  balance: number;
  escrow: number;
  onSwitch: (id: string) => void;
  onNewPair: () => void;
  onEditName: () => void;
  onOpenSettings: () => void;
}

type Menu = null | "pair" | "balance" | "more";

// Site root under the GH Pages sub-path. Plain <a> (not router <A>) so the
// bar also renders outside a Route (tests); a full load of the static home
// page is fine here.
const HOME = import.meta.env.SERVER_BASE_URL || "/";

// Compact sticky app bar for /app (PRD-49): home, pair switcher, balance.
export default function AppBar(props: Props) {
  const [menu, setMenu] = createSignal<Menu>(null);
  const toggle = (m: Exclude<Menu, null>) => setMenu((cur) => (cur === m ? null : m));
  let root: HTMLElement | undefined;

  onMount(() => {
    const onDoc = (e: MouseEvent) => {
      if (menu() && root && !root.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    onCleanup(() => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    });
  });

  return (
    <header class="appbar" ref={root}>
      <div class="appbar-row">
        <a href={HOME} class="appbar-home" aria-label="Home, privacy and terms">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />
          </svg>
        </a>

        <button
          type="button"
          class="appbar-pair"
          aria-expanded={menu() === "pair"}
          aria-controls="appbar-pair-menu"
          aria-label={`Paired with ${props.partnerName}. Switch pair`}
          onClick={() => toggle("pair")}
        >
          <span class="pair-avatars" aria-hidden="true">
            <span class="avatar avatar--me avatar--xs">{initial(props.myName)}</span>
            <span class="avatar avatar--partner avatar--xs">{initial(props.partnerName)}</span>
          </span>
          <span class="appbar-pair-name">{props.partnerName}</span>
          <svg class="chev" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7 10 5 5 5-5" />
          </svg>
        </button>

        <button
          type="button"
          class="balance-pill"
          aria-expanded={menu() === "balance"}
          aria-controls="appbar-balance"
          aria-label={`${props.balance} ${props.balance === 1 ? "heart" : "hearts"} to spend. What is this?`}
          onClick={() => toggle("balance")}
        >
          <HeartIcon filled />
          <span class="balance-num">{props.balance}</span>
          <Show when={props.escrow > 0}>
            <span class="balance-escrow" aria-hidden="true">+{props.escrow}</span>
          </Show>
        </button>

        <button
          type="button"
          class="appbar-more"
          aria-expanded={menu() === "more"}
          aria-controls="appbar-more-menu"
          aria-label="More"
          onClick={() => toggle("more")}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </button>
      </div>

      <Show when={menu() === "pair"}>
        <div id="appbar-pair-menu" class="popover popover--start">
          <p class="popover-label">Your pairs</p>
          <ul class="pair-menu">
            <For each={props.pairs}>
              {(p) => (
                <li>
                  <button
                    type="button"
                    class="pair-menu-item"
                    aria-current={p.id === props.currentId ? "true" : undefined}
                    onClick={() => {
                      setMenu(null);
                      props.onSwitch(p.id);
                    }}
                  >
                    <span class="avatar avatar--partner avatar--sm">{initial(p.partnerName)}</span>
                    {props.myName} &amp; {p.partnerName}
                    <Show when={p.id === props.currentId}>
                      <span class="note-badge">open</span>
                    </Show>
                  </button>
                </li>
              )}
            </For>
            <li>
              <button
                type="button"
                class="pair-menu-item pair-menu-add"
                onClick={() => {
                  setMenu(null);
                  props.onNewPair();
                }}
              >
                + New pair
                <span class="pair-menu-hint">a separate notebook with someone else</span>
              </button>
            </li>
          </ul>
        </div>
      </Show>

      <Show when={menu() === "balance"}>
        <div id="appbar-balance" class="popover popover--end" role="note">
          <p class="popover-big">
            <HeartIcon filled /> {props.balance}
          </p>
          <p>
            Hearts {props.partnerName} gave you, ready to spend on your wishes.
          </p>
          <Show when={props.escrow > 0}>
            <p>
              <strong>{props.escrow}</strong> more are set aside for claims in
              progress — returned if they don't happen.
            </p>
          </Show>
          <p class="popover-hint">
            Earn them by being lovely; spend them in <em>My wishes</em>.
          </p>
        </div>
      </Show>

      <Show when={menu() === "more"}>
        <div id="appbar-more-menu" class="popover popover--end">
          <div class="popover-row">
            <span>Private mode</span>
            <PrivacyToggle />
          </div>
          <button
            type="button"
            class="pair-menu-item"
            onClick={() => {
              setMenu(null);
              props.onEditName();
            }}
          >
            Edit my name
          </button>
          <button
            type="button"
            class="pair-menu-item"
            onClick={() => {
              setMenu(null);
              props.onOpenSettings();
            }}
          >
            Settings
          </button>
          <a href={HOME} class="pair-menu-item">
            Home, privacy &amp; terms
          </a>
        </div>
      </Show>
    </header>
  );
}
