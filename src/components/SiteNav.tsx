import { For } from "solid-js";
import { A } from "@solidjs/router";

// Shared navigation. <A> automatically prefixes the router `base`
// (SERVER_BASE_URL, e.g. /lp9-beta), so hrefs resolve correctly under the
// GitHub Pages sub-path. English literals for now (i18n is Phase 7).
const LINKS: { href: string; label: string; end?: boolean }[] = [
  { href: "/", label: "Home", end: true },
  { href: "/app", label: "App" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export default function SiteNav() {
  return (
    <nav class="site-nav" aria-label="Primary">
      <ul class="site-nav-list">
        <For each={LINKS}>
          {(link) => (
            <li>
              <A href={link.href} end={link.end} class="site-nav-link">
                {link.label}
              </A>
            </li>
          )}
        </For>
      </ul>
    </nav>
  );
}
