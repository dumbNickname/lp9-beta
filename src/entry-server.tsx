import { createHandler, StartServer } from "@solidjs/start/server";

const basePath = import.meta.env.BASE_URL || "/";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <base href={basePath} />
          {/* Theme-init script slot — filled in PRD-10 (no-flash theme). */}
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
