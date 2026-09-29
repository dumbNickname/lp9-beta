import { createHandler, StartServer } from "@solidjs/start/server";
import { APP_NAME } from "~/constants";
import { THEME_INIT_SCRIPT } from "~/lib/theme";

const basePath = import.meta.env.BASE_URL || "/";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
          <base href={basePath} />
          <link rel="manifest" href={`${basePath}manifest.webmanifest`} />
          <link rel="icon" type="image/png" sizes="32x32" href={`${basePath}icons/favicon-32.png`} />
          <link rel="apple-touch-icon" href={`${basePath}icons/apple-touch-icon.png`} />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content={APP_NAME} />
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
