// Client-side offline submission queue (build spec §9 item 15, §8 indicator)
// + shift-key offline cache (spec 11.6). Mutations that fail because the
// network is down are persisted to IndexedDB and replayed FIFO once
// connectivity returns, carrying the shift key + performed-at timestamp so the
// backend can accept (and flag) stale-key replays instead of dropping them.
// IndexedDB (not localStorage) is used so FormData payloads (e.g. lab PDF
// uploads) survive via structured clone.

export type QueuedRequest = {
  id: string;
  path: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  headers: Record<string, string>;
  body: BodyInit | null;
  token: string | null;
  shiftKey?: string | null;
  performedAt?: number;
  queuedAt: number;
};

export type CachedShiftKey = { key: string; generatedAt: string; cachedAt: number } | null;

const DB_NAME = "hpb-offline-queue";
const STORE_NAME = "pending";
const META_STORE = "meta";
const DB_VERSION = 2;

// State is kept on globalThis (not module scope) so that webpack's chunk
// splitting can never create two independent instances of this module with
// separate memory mirrors / listener sets (layout vs page chunks).
const G = globalThis as unknown as {
  __hpbQueue?: {
    memory: QueuedRequest[];
    initialized: boolean;
    dbPromise: Promise<IDBDatabase> | null;
    listeners: Set<() => void>;
  };
};
const state = (G.__hpbQueue ??= {
  memory: [] as QueuedRequest[],
  initialized: false,
  dbPromise: null as Promise<IDBDatabase> | null,
  listeners: new Set<() => void>(),
});

function notify() {
  for (const fn of state.listeners) fn();
}

export function subscribe(fn: () => void): () => void {
  state.listeners.add(fn);
  return () => {
    state.listeners.delete(fn);
  };
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"));
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!req.result.objectStoreNames.contains(META_STORE)) {
        req.result.createObjectStore(META_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
  });
}

function getDb(): Promise<IDBDatabase> {
  if (!state.dbPromise) state.dbPromise = openDb();
  return state.dbPromise;
}

function withStore<T>(name: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return getDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(name, mode);
        const req = fn(tx.objectStore(name));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("IndexedDB request failed"));
      })
  );
}

export async function readAllPending(): Promise<QueuedRequest[]> {
  if (typeof indexedDB === "undefined") return [];
  return withStore<QueuedRequest[]>(STORE_NAME, "readonly", (s) => s.getAll());
}

export async function enqueueRequest(
  input: Omit<QueuedRequest, "id" | "queuedAt"> & { performedAt?: number }
): Promise<QueuedRequest> {
  const item: QueuedRequest = {
    ...input,
    performedAt: input.performedAt ?? Date.now(),
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    queuedAt: Date.now(),
  };
  await withStore(STORE_NAME, "readwrite", (s) => s.put(item));
  state.memory = await readAllPending();
  notify();
  return item;
}

export async function removePending(id: string): Promise<void> {
  await withStore(STORE_NAME, "readwrite", (s) => s.delete(id));
  state.memory = await readAllPending();
  notify();
}

export function getPendingCount(): number {
  return state.memory.length;
}

// --- Shift-key offline cache (spec 11.6) -------------------------------------
// Stored in IndexedDB's meta store so the value survives reloads while offline
// (the intern can still queue writes keyed to the last-known key).

export async function getCachedShiftKey(): Promise<string | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const rec = await withStore<{ id: string; key: string; generatedAt: string; cachedAt: number } | undefined>(
      META_STORE,
      "readonly",
      (s) => s.get("shiftKey")
    );
    return rec?.key ?? null;
  } catch {
    return null;
  }
}

export async function getCachedShiftKeyRecord(): Promise<CachedShiftKey> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const rec = await withStore<{ id: string; key: string; generatedAt: string; cachedAt: number } | undefined>(
      META_STORE,
      "readonly",
      (s) => s.get("shiftKey")
    );
    return rec ? { key: rec.key, generatedAt: rec.generatedAt, cachedAt: rec.cachedAt } : null;
  } catch {
    return null;
  }
}

export async function setCachedShiftKey(key: string, generatedAt?: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await withStore(META_STORE, "readwrite", (s) =>
      s.put({ id: "shiftKey", key, generatedAt: generatedAt || new Date().toISOString(), cachedAt: Date.now() })
    );
  } catch {
    // best-effort — the in-memory fallback in lib/shift-key-client covers this
  }
}

export async function clearCachedShiftKey(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await withStore(META_STORE, "readwrite", (s) => s.delete("shiftKey"));
  } catch {
    // best-effort
  }
}

// Idempotent. Hydrates the in-memory mirror from IndexedDB and keeps the UI
// honest about online/offline transitions.
export async function initQueue(): Promise<void> {
  if (state.initialized || typeof window === "undefined") return;
  state.initialized = true;
  try {
    state.memory = await readAllPending();
  } catch {
    state.memory = [];
  }
  notify();
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
}
