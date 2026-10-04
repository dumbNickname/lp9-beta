// Wrapped localStorage access: SSR-safe and silent when storage is
// unavailable (private mode, quota, blocked).
function store(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readLocal(key: string): string | null {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeLocal(key: string, value: string): void {
  try {
    store()?.setItem(key, value);
  } catch {
    // storage unavailable
  }
}

export function removeLocal(key: string): void {
  try {
    store()?.removeItem(key);
  } catch {
    // storage unavailable
  }
}

export function readJson<T>(key: string): T | null {
  const raw = readLocal(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function removeLocalWhere(match: (key: string) => boolean): void {
  const s = store();
  if (!s) return;
  try {
    for (let i = s.length - 1; i >= 0; i -= 1) {
      const k = s.key(i);
      if (k && match(k)) s.removeItem(k);
    }
  } catch {
    // storage unavailable
  }
}
