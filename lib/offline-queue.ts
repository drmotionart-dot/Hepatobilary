// Client-side offline submission queue (build spec §9 item 15, §8 indicator).
// Mutations that fail because the network is down are persisted to IndexedDB
// and replayed FIFO once connectivity returns. IndexedDB (not localStorage)
// is used so FormData payloads (e.g. lab PDF uploads) survive via structured
// clone.

export type QueuedRequest = {
  id: string;
  path: string;
  method: "POST" | "PATCH" | "PUT" | "DELETE";
  headers: Record<string, string>;
  body: BodyInit | null;
  token: string | null;
  queuedAt: number;
};

const DB_NAME = "hpb-offline-queue";
const STORE_NAME = "pending";
const DB_VERSION = 1;

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
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
  });
}

function getDb(): Promise<IDBDatabase> {
  if (!state.dbPromise) state.dbPromise = openDb();
  return state.dbPromise;
}

function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return getDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const req = fn(tx.objectStore(STORE_NAME));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("IndexedDB request failed"));
      })
  );
}

export async function readAllPending(): Promise<QueuedRequest[]> {
  if (typeof indexedDB === "undefined") return [];
  return withStore<QueuedRequest[]>("readonly", (s) => s.getAll());
}

export async function enqueueRequest(
  input: Omit<QueuedRequest, "id" | "queuedAt">
): Promise<QueuedRequest> {
  const item: QueuedRequest = {
    ...input,
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    queuedAt: Date.now(),
  };
  await withStore("readwrite", (s) => s.put(item));
  state.memory = await readAllPending();
  notify();
  return item;
}

export async function removePending(id: string): Promise<void> {
  await withStore("readwrite", (s) => s.delete(id));
  state.memory = await readAllPending();
  notify();
}

export function getPendingCount(): number {
  return state.memory.length;
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
