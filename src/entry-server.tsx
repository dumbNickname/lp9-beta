import { createHandler, StartServer } from "@solidjs/start/server";
import { THEME_INIT_SCRIPT } from "~/lib/theme";

const basePath = import.meta.env.BASE_URL || "/";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <base href={basePath} />
          {/* No-flash theme init: set data-theme before first paint. */}
          {/* eslint-disable-next-line solid/no-innerhtml */}
          <script innerHTML={THEME_INIT_SCRIPT} />
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
