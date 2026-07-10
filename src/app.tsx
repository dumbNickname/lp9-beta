import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
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

export default function App() {
  return (
    <Router
      base={routerBase}
      root={(props) => (
        <>
          <header class="app-header">
            <ThemeToggle />
          </header>
          <Suspense>{props.children}</Suspense>
        </>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
