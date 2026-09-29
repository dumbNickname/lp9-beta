// Service worker registration (PRD-52). The SW file lives at
// `<BASE_PATH>sw.js`, so its scope is the whole site sub-path.
export const SW_URL = `${import.meta.env.SERVER_BASE_URL || "/"}sw.js`.replace(/\/{2,}/g, "/");

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
    if (import.meta.env.DEV) return null;
    return await navigator.serviceWorker.register(SW_URL);
  } catch {
    return null;
  }
}

// True when launched from the home screen (installed PWA).
export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

export function isIos(): boolean {
  try {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}
