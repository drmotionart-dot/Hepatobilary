"use client";

// Client-side API helper. Stores the JWT in a readable cookie (so server
// pages can verify it too) and attaches it to every backend request.
//
// Offline behavior: mutations (POST/PATCH/PUT/DELETE) that fail because the
// network is unreachable are persisted to the IndexedDB queue and replayed
// FIFO once connectivity returns (see lib/offline-queue.ts). The caller gets
// a 202 "queued locally" response instead of a hard error, and the
// OfflineQueueBanner shows an honest "saved on this device" state.

import {
  enqueueRequest,
  readAllPending,
  removePending,
  initQueue,
} from "@/lib/offline-queue";

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

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const method = (options.method || "GET").toUpperCase();

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
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
        const item = await enqueueRequest({ path, method: method as "POST" | "PATCH" | "PUT" | "DELETE", headers: storedHeaders, body, token });
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
  return res;
}

// Replays queued mutations in FIFO order. Successes and client errors (4xx,
// which would never succeed on retry) are removed; network/5xx failures stay
// queued for the next attempt. Returns the number of items cleared.
export async function flushOfflineQueue(): Promise<number> {
  if (typeof window === "undefined") return 0;
  const items = await readAllPending();
  let cleared = 0;
  for (const item of items) {
    const token = getToken() || item.token;
    const headers = new Headers(item.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
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
}
