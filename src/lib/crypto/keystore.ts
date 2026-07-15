const DB_NAME = "app-keystore";
const STORE = "relationship-keys";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        transaction.oncomplete = () => db.close();
      }),
  );
}

export function putKey(relationshipId: string, key: CryptoKey): Promise<void> {
  return tx("readwrite", (s) => s.put(key, relationshipId)).then(() => undefined);
}

export async function getKey(
  relationshipId: string,
): Promise<CryptoKey | null> {
  try {
    const result = await tx<CryptoKey | undefined>("readonly", (s) =>
      s.get(relationshipId),
    );
    return result ?? null;
  } catch {
    return null;
  }
}

export function deleteKey(relationshipId: string): Promise<void> {
  return tx("readwrite", (s) => s.delete(relationshipId)).then(() => undefined);
}

export async function hasKey(relationshipId: string): Promise<boolean> {
  return (await getKey(relationshipId)) !== null;
}
