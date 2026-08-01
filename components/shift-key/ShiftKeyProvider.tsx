"use client";

// Shift-key provider (spec 11.6). Owns the user's cached shift key, registers
// the global prompter that apiFetch awaits for gated intern writes, and renders
// the "enter the ward key" modal. Also validates the entered key against the
// backend's current key (skipped while offline — the backend flags stale keys
// on sync instead of dropping them).

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getCachedShiftKeyRecord } from "@/lib/offline-queue";
import {
  registerShiftKeyPrompter,
  saveShiftKey,
  forgetShiftKey,
  type ShiftKeyPromptResult,
} from "@/lib/shift-key-client";
import { apiFetch } from "@/lib/client-api";
import Button from "@/components/ui/Button";

type ShiftKeyContextValue = {
  cachedKey: string | null;
  cachedGeneratedAt: string | null;
  promptVisible: boolean;
  saveKey: (key: string, generatedAt?: string) => Promise<void>;
  clearKey: () => Promise<void>;
  requestKey: () => Promise<ShiftKeyPromptResult>;
  closePrompt: () => void;
};

const ShiftKeyContext = createContext<ShiftKeyContextValue>({
  cachedKey: null,
  cachedGeneratedAt: null,
  promptVisible: false,
  saveKey: async () => {},
  clearKey: async () => {},
  requestKey: async () => null,
  closePrompt: () => {},
});

export function useShiftKey() {
  return useContext(ShiftKeyContext);
}

export default function ShiftKeyProvider({ children }: { children: React.ReactNode }) {
  const [cachedKey, setCachedKey] = useState<string | null>(null);
  const [cachedGeneratedAt, setCachedGeneratedAt] = useState<string | null>(null);
  const [promptVisible, setPromptVisible] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [validating, setValidating] = useState(false);
  const resolverRef = useRef<((v: ShiftKeyPromptResult) => void) | null>(null);

  // Hydrate the cached key once + keep in sync with the offline store.
  useEffect(() => {
    let alive = true;
    getCachedShiftKeyRecord().then((rec) => {
      if (!alive) return;
      setCachedKey(rec?.key ?? null);
      setCachedGeneratedAt(rec?.generatedAt ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  const openPrompt = useCallback(
    () =>
      new Promise<ShiftKeyPromptResult>((resolve) => {
        resolverRef.current = resolve;
        setInput("");
        setError("");
        setPromptVisible(true);
      }),
    []
  );

  useEffect(() => {
    registerShiftKeyPrompter(openPrompt);
    return () => registerShiftKeyPrompter(null);
  }, [openPrompt]);

  const closePrompt = useCallback(() => {
    setPromptVisible(false);
    resolverRef.current?.(null);
    resolverRef.current = null;
  }, []);

  const saveKey = useCallback(async (key: string, generatedAt?: string) => {
    await saveShiftKey(key, generatedAt);
    setCachedKey(key);
    setCachedGeneratedAt(generatedAt ?? new Date().toISOString());
  }, []);

  const clearKey = useCallback(async () => {
    await forgetShiftKey();
    setCachedKey(null);
    setCachedGeneratedAt(null);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const key = input.trim().toUpperCase();
    if (!key) return;
    setError("");
    setValidating(true);
    try {
      // Validate against the backend's current key when online. Offline we
      // accept the entered key (best-effort) — the sync replay is still
      // delivered and flagged by the backend.
      const res = await apiFetch("/api/shift-key/current");
      if (res.ok) {
        const current = await res.json();
        const match = current?.key === key;
        if (!match) {
          setError("That doesn't match the current ward shift key.");
          setValidating(false);
          return;
        }
        await saveKey(key, current?.generatedAt ?? new Date().toISOString());
      } else {
        await saveKey(key);
      }
    } catch {
      // Offline / server unreachable — accept and flag later.
      await saveKey(key);
    }
    setValidating(false);
    setPromptVisible(false);
    resolverRef.current?.(key);
    resolverRef.current = null;
  }

  return (
    <ShiftKeyContext.Provider value={{ cachedKey, cachedGeneratedAt, promptVisible, saveKey, clearKey, requestKey: openPrompt, closePrompt }}>
      {children}

      {promptVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true">
          <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-lg">
            <h3 className="text-base font-semibold">Enter ward shift key</h3>
            <p className="mt-1 text-xs text-muted">
              Patient-data actions require the current ward shift key (spec 11.6). Ask the duty resident or admin for today&apos;s key.
            </p>
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value.toUpperCase())}
              placeholder="e.g. Z7E4KT"
              className="mt-4 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm font-mono tracking-widest uppercase outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {error && <p className="mt-2 text-xs text-danger">{error}</p>}
            <div className="mt-4 flex gap-2">
              <Button type="submit" loading={validating} disabled={!input.trim()}>
                {validating ? "Checking…" : "Use this key"}
              </Button>
              <Button type="button" variant="ghost" onClick={closePrompt}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </ShiftKeyContext.Provider>
  );
}
