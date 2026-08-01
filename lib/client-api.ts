"use client";

// Client-side API helper. Stores the JWT in a readable cookie (so server
// pages can verify it too) and attaches it to every backend request.
//
// Shift-key gate (spec 11.6): for the six intern-gated patient-data mutations
// the helper attaches the cached ward shift key as `x-shift-key` (prompting the
// user once if none is cached) and transparently re-prompts + retries if the
// server rejects a wrong key.
//
// Offline behavior: mutations (POST/PATCH/PUT/DELETE) that fail because the
// network is unreachable are persisted to the IndexedDB queue and replayed
// FIFO once connectivity returns (see lib/offline-queue.ts). Replays carry
// `x-sync-replay` + `x-performed-at` + the stored shift key, so the backend can
// accept stale-key writes (flagged) instead of dropping offline work. The
// caller gets a 202 "queued locally" response instead of a hard error.

import {
  enqueueRequest,
  readAllPending,
  removePending,
  initQueue,
  getCachedShiftKey,
} from "@/lib/offline-queue";
import { isGatedRequest, getRole, ensureShiftKey, saveShiftKey, forgetShiftKey } from "@/lib/shift-key-client";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/+$/, "");
const TOKEN_COOKIE = "token";

const MUTATION_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);
// Account/auth actions must surface failures immediately — never queue.
const NO_QUEUE_PATHS = new Set(["/api/auth/login", "/api/register", "/api/change-password"]);

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=28800; SameSite=Lax`;
}

export function clearToken() {
  if (typeof window === "undefined") return;
  document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function queuedResponse(id: string): Response {
  return new Response(JSON.stringify({ ok: true, queued: true, queueId: id }), {
    status: 202,
    headers: { "Content-Type": "application/json" },
  });
}

// A 202 here means the mutation was queued locally (see queuedResponse) — it
// hasn't reached the server yet, so nothing is worth refreshing for.
export function isQueuedResponse(res: Response): boolean {
  return res.status === 202;
}

// Offline-safe router.refresh(): Next falls back to a full browser navigation
// when the RSC refresh fetch fails, which kills the app mid-form while offline.
// Skip the refresh for queued writes and while the browser is offline — the
// offline banner handles surfacing the pending sync instead.
export function safeRefresh(router: { refresh: () => void }, res?: Response): void {
  if (res && isQueuedResponse(res)) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  router.refresh();
}

function gateResponse(code: "shift-key-missing" | "shift-key-invalid", message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: message, code }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

async function readCode(res: Response): Promise<string | null> {
  try {
    const data = await res.clone().json();
    return typeof data?.code === "string" ? data.code : null;
  } catch {
    return null;
  }
}

async function performRequest(path: string, options: RequestInit, headers: Headers, shiftKey: string | null): Promise<Response> {
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (shiftKey) headers.set("x-shift-key", shiftKey);
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const method = (options.method || "GET").toUpperCase();
  const role = typeof window !== "undefined" ? getRole() : null;
  const gated = role === "intern" && MUTATION_METHODS.has(method) && isGatedRequest(method, path);

  // Intern gated write: obtain a key (cached or prompted) before sending.
  let shiftKey: string | null = null;
  if (gated) {
    shiftKey = await ensureShiftKey();
    if (!shiftKey) return gateResponse("shift-key-missing", "This action requires the current ward shift key.");
  }

  let res: Response;
  try {
    res = await performRequest(path, options, headers, shiftKey);
  } catch {
    const queuable = MUTATION_METHODS.has(method) && !NO_QUEUE_PATHS.has(path);
    if (queuable && typeof window !== "undefined") {
      try {
        const storedHeaders: Record<string, string> = {};
        headers.forEach((value, key) => {
          storedHeaders[key] = value;
        });
        const body = options.body ?? null;
        if (body instanceof FormData) {
          // Let fetch set the multipart boundary on replay.
          delete storedHeaders["Content-Type"];
          delete storedHeaders["content-type"];
        }
        const item = await enqueueRequest({
          path,
          method: method as "POST" | "PATCH" | "PUT" | "DELETE",
          headers: storedHeaders,
          body,
          token,
          shiftKey: shiftKey ?? (await getCachedShiftKey()),
          performedAt: Date.now(),
        });
        return queuedResponse(item.id);
      } catch {
        // Queue unavailable — fall through and surface the network error.
      }
    }
    throw new Error(`Network request to ${path} failed`);
  }

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined" && !path.includes("/auth/login")) {
      window.location.href = "/login";
    }
  }

  // Wrong key → clear the cached key, prompt again, and retry once. The user
  // never loses the write; only a dismissed prompt surfaces as a 403.
  if (gated && res.status === 403 && (await readCode(res)) === "shift-key-invalid") {
    await forgetShiftKey();
    const next = await ensureShiftKey();
    if (!next) return gateResponse("shift-key-invalid", "Incorrect shift key — this action was not saved.");
    const retry = await performRequest(path, options, headers, next);
    if (retry.status !== 403 || (await readCode(retry)) !== "shift-key-invalid") {
      await saveShiftKey(next);
    }
    return retry;
  }

  // A valid key was accepted (or this write wasn't gated) — remember it so
  // future gated writes skip the prompt.
  if (gated && shiftKey && (res.ok || res.status === 400 || res.status === 201)) {
    void saveShiftKey(shiftKey);
  }

  return res;
}

// Serializes concurrent flush calls (e.g. a reconnect event racing a boot
// flush) so an item can never be replayed twice.
let flushInFlight: Promise<number> | null = null;

// Replays queued mutations in FIFO order. Successes and client errors (4xx,
// which would never succeed on retry) are removed; network/5xx failures stay
// queued for the next attempt. Returns the number of items cleared.
export function flushOfflineQueue(): Promise<number> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = (async () => {
    if (typeof window === "undefined") return 0;
    const items = await readAllPending();
    let cleared = 0;
    for (const item of items) {
      const token = getToken() || item.token;
      const headers = new Headers(item.headers || {});
      if (token) headers.set("Authorization", `Bearer ${token}`);
      // Offline replays must be accepted-and-flagged, not dropped: send the
      // original shift key + performed-at so the backend validates against the
      // key that was live at write time.
      headers.set("x-sync-replay", "true");
      if (item.performedAt) headers.set("x-performed-at", new Date(item.performedAt).toISOString());
      if (item.shiftKey) headers.set("x-shift-key", item.shiftKey);
      try {
        const res = await fetch(`${API_BASE}${item.path}`, {
          method: item.method,
          headers,
          body: item.body ?? undefined,
        });
        if (res.ok || (res.status >= 400 && res.status < 500)) {
          await removePending(item.id);
          cleared++;
        }
      } catch {
        // Still offline / transient failure — keep for the next retry.
      }
    }
    return cleared;
  })();
  const p = flushInFlight;
  p.finally(() => {
    if (flushInFlight === p) flushInFlight = null;
  });
  return p;
}

let offlineInitDone = false;

// Idempotent bootstrap: hydrate the queue and auto-flush on reconnect.
export function initOfflineQueue(): void {
  if (offlineInitDone || typeof window === "undefined") return;
  offlineInitDone = true;
  initQueue();
  window.addEventListener("online", () => {
    flushOfflineQueue();
  });
  // Flush anything left over from a previous offline session on app boot
  // (e.g. a reload while online with pending items).
  readAllPending().then((items) => {
    if (items.length) void flushOfflineQueue();
  });
}
