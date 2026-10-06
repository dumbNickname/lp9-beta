/* Service worker (PRD-52): offline shell + web push (PRD-53).
 * Scope = the directory this file is served from (e.g. /lp9-beta/).
 * Never caches cross-origin requests (Supabase stays network-only). */
const CACHE = "shell-v1";
const BASE = self.registration.scope; // e.g. https://host/lp9-beta/
const SHELL = [BASE, BASE + "app", BASE + "manifest.webmanifest", BASE + "icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !req.url.startsWith(BASE)) return;

  // Pages: network first, fall back to the cached app shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match(BASE + "app") || caches.match(BASE)),
        ),
    );
    return;
  }

  // Hashed build assets are immutable: cache first.
  if (url.pathname.includes("/_build/assets/") || url.pathname.includes("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
  }
});

// --- Web push (PRD-53). Payloads are content-free by design (DESIGN §8b).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Something new for you";
  const report = (ok, error) =>
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => list.forEach((c) => c.postMessage({ type: "push-received", tag: data.tag, ok, error })));
  event.waitUntil(
    self.registration
      .showNotification(title, {
        body: data.body || "Open the app to see.",
        icon: BASE + "icons/icon-192.png",
        badge: BASE + "icons/icon-192.png",
        tag: data.tag || "update",
        renotify: false,
        data: { url: BASE + (data.path || "app") },
      })
      .then(
        () => report(true, null),
        (e) => report(false, String((e && e.message) || e)),
      ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || BASE + "app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.startsWith(BASE) && "focus" in c) {
          c.navigate(target).catch(() => undefined);
          return c.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
