import { defineConfig } from "@solidjs/start/config";

// GitHub Pages can serve the site from a sub-path (e.g. /lp9-beta/).
// BASE_PATH is the build-time prefix for that; defaults to "/" for local
// dev and root deploys. See DESIGN.md §"Tech stack" and HANDOFF §0.2.
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  ssr: true,
  server: {
    preset: "static",
    baseURL: basePath,
    prerender: {
      routes: ["/", "/privacy", "/terms", "/app"],
      crawlLinks: true,
    },
  },
  // Vite base so built asset URLs are prefixed with BASE_PATH.
  vite: {
    base: basePath,
  },
});
