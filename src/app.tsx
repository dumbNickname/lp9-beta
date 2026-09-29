import { Router, useLocation } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Show, Suspense } from "solid-js";
import SessionProvider from "~/components/SessionProvider";
import SiteNav from "~/components/SiteNav";
import ThemeToggle from "~/components/ThemeToggle";
import "~/styles/global.css";

// When deployed under a GitHub Pages sub-path, the app is served from
// BASE_PATH (e.g. /lp9-beta/). SolidStart does not wire that into the
// router base automatically, so the router must be told explicitly or it
// matches the prefixed URL against root routes and renders nothing.
// Trailing slash trimmed: @solidjs/router expects base without it.
const routerBase = (import.meta.env.SERVER_BASE_URL || "/").replace(
  /\/$/,
  "",
);

// The marketing header (site nav + theme) is for public pages only; /app
// has its own compact AppBar (PRD-49).
function SiteHeader() {
  const location = useLocation();
  const inApp = () => /\/app(\/|$)/.test(location.pathname);
  return (
    <Show when={!inApp()}>
      <header class="app-header">
        <SiteNav />
        <ThemeToggle />
      </header>
    </Show>
  );
}

export default function App() {
  return (
    <Router
      base={routerBase}
      root={(props) => (
        <SessionProvider>
          <SiteHeader />
          <Suspense>{props.children}</Suspense>
        </SessionProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
