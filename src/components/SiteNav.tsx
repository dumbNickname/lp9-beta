import { createEffect, For } from "solid-js";
import { A, useLocation } from "@solidjs/router";

// Shared navigation. <A> automatically prefixes the router `base`
// (SERVER_BASE_URL, e.g. /lp9-beta), so hrefs resolve correctly under the
// GitHub Pages sub-path. English literals for now (i18n is Phase 7).
const LINKS: { href: string; label: string; end?: boolean }[] = [
  { href: "/", label: "Home", end: true },
  { href: "/app", label: "App" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

// `target` is the anchor's resolved href (router base already applied).
export function isCurrent(pathname: string, target: string, end?: boolean): boolean {
  const norm = (p: string) => p.replace(/\/+$/, "").toLowerCase() || "/";
  const path = norm(pathname);
  const t = norm(target);
  return end ? path === t : path === t || path.startsWith(t + "/");
}

export default function SiteNav() {
  const location = useLocation();
  const links: HTMLAnchorElement[] = [];

  // Solid skips attribute writes while it still considers the page to be
  // hydrating, which can leave <A>'s aria-current stale on the FIRST client
  // navigation after a full load (two links "selected"). Write it directly
  // on every route change so it is always correct.
  createEffect(() => {
    const pathname = location.pathname;
    LINKS.forEach((link, i) => {
      const el = links[i];
      if (!el) return;
      const on = isCurrent(pathname, el.getAttribute("href") ?? link.href, link.end);
      if (on) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
      el.classList.toggle("active", on);
      el.classList.toggle("inactive", !on);
    });
  });

  return (
    <nav class="site-nav" aria-label="Primary">
      <ul class="site-nav-list">
        <For each={LINKS}>
          {(link, i) => (
            <li>
              <A
                ref={(el: HTMLAnchorElement) => (links[i()] = el)}
                href={link.href}
                end={link.end}
                class="site-nav-link"
              >
                {link.label}
              </A>
            </li>
          )}
        </For>
      </ul>
    </nav>
  );
}
