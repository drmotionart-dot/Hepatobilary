"use client";

// Client-side shift-key manager (spec 11.6). The ward's current shift key is
// cached in IndexedDB (lib/offline-queue meta store) so interns can keep
// working offline; when a gated write needs a key that isn't cached, the
// ShiftKeyProvider registers a global prompter and apiFetch awaits it. Only
// the six intern-gated patient-data mutations trigger a prompt.

import { getCachedShiftKey, setCachedShiftKey, clearCachedShiftKey } from "@/lib/offline-queue";

export type ShiftKeyPromptResult = string | null; // null = dismissed

type Prompter = () => Promise<ShiftKeyPromptResult>;

const G = globalThis as unknown as {
  __hpbShiftKey?: {
    prompter: Prompter | null;
    listeners: Set<() => void>;
  };
};

const st = (G.__hpbShiftKey ??= {
  prompter: null as Prompter | null,
  listeners: new Set<() => void>(),
});

export function subscribeShiftKey(fn: () => void): () => void {
  st.listeners.add(fn);
  return () => {
    st.listeners.delete(fn);
  };
}

function notifyShiftKey() {
  for (const fn of st.listeners) fn();
}

export function registerShiftKeyPrompter(fn: Prompter | null) {
  st.prompter = fn;
  notifyShiftKey();
}

// The six intern-gated mutations (backend requireShiftKeyForIntern):
// clinical notes, lab panels, treatment logs, imaging requests (+ status
// updates) and referral consults.
export const GATED_MUTATIONS: { method: string; path?: string; pathPrefix?: string }[] = [
  { method: "POST", path: "/api/clinical-notes" },
  { method: "POST", path: "/api/lab-panels" },
  { method: "POST", path: "/api/treatment-logs" },
  { method: "POST", path: "/api/imaging-requests" },
  { method: "PATCH", pathPrefix: "/api/imaging-requests/" },
  { method: "POST", path: "/api/referral-consults" },
];

export function isGatedRequest(method: string, path: string): boolean {
  const m = method.toUpperCase();
  return GATED_MUTATIONS.some(
    (g) => g.method === m && (g.path ? path === g.path : g.pathPrefix ? path.startsWith(g.pathPrefix) : false)
  );
}

// The caller's role (decoded from the JWT cookie). Residents/admins skip the
// gate entirely — only interns are prompted.
export function getRole(): "intern" | "resident" | "admin" | null {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )token=([^;]*)/);
  if (!match) return null;
  try {
    const payload = JSON.parse(atob(match[1].split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    const role = payload.role;
    return role === "intern" || role === "resident" || role === "admin" ? role : null;
  } catch {
    return null;
  }
}

export async function getStoredShiftKey(): Promise<string | null> {
  return getCachedShiftKey();
}

export async function saveShiftKey(key: string, generatedAt?: string): Promise<void> {
  await setCachedShiftKey(key, generatedAt);
  notifyShiftKey();
}

export async function forgetShiftKey(): Promise<void> {
  await clearCachedShiftKey();
  notifyShiftKey();
}

// Returns the current cached key, prompting the user if none is cached.
// Resolves null if the user dismisses the prompt (caller surfaces the error).
export async function ensureShiftKey(): Promise<string | null> {
  const cached = await getStoredShiftKey();
  if (cached) return cached;
  if (st.prompter) return st.prompter();
  return null;
}
