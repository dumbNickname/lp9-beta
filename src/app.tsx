import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import ThemeToggle from "~/components/ThemeToggle";
import "~/styles/global.css";

export default function App() {
  return (
    <Router
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
