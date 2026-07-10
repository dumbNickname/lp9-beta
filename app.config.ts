import { defineConfig } from "@solidjs/start/config";

// GitHub Pages can serve the site from a sub-path (e.g. /lp9-beta/).
// BASE_PATH is the build-time prefix for that; defaults to "/" for local
// dev and root deploys. See DESIGN.md §"Tech stack" and HANDOFF §0.2.
const basePath = process.env.BASE_PATH ?? "/";

// Prerender routes must be the *served* paths. With a non-root baseURL
// the app serves content under basePath, so the prerender crawler has
// to request the prefixed paths or it captures only the empty shell.
const withBase = (p: string) =>
  (basePath.replace(/\/$/, "") + p).replace(/\/{2,}/g, "/");

export default defineConfig({
  ssr: true,
  server: {
    preset: "static",
    baseURL: basePath,
    prerender: {
      routes: ["/", "/privacy", "/terms", "/app"].map(withBase),
      crawlLinks: true,
    },
  },
  // Vite base so built asset URLs are prefixed with BASE_PATH.
  vite: {
    base: basePath,
  },
});
