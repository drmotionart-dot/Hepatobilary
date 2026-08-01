"use client";

// Compact shift-key badge for the TopBar (spec 11.6). Residents/admins see the
// current ward key; interns see their cached key (or a prompt to enter it) so
// gated writes work without digging through the dashboard.

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { getRole } from "@/lib/shift-key-client";
import { useShiftKey } from "@/components/shift-key/ShiftKeyProvider";

export default function ShiftKeyBadge() {
  const { cachedKey, requestKey } = useShiftKey();
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const role = getRole();

  // The badge depends on document.cookie + IndexedDB, which don't exist during
  // SSR — render nothing until hydration completes to avoid a mismatch.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let alive = true;
    apiFetch("/api/shift-key/current")
      .then((res) => (res.ok ? res.json() : null))
      .then((d) => {
        if (alive && d?.key) setCurrentKey(d.key);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!mounted || !role) return null;

  const isIntern = role === "intern";
  const shown = isIntern ? cachedKey : currentKey;

  if (isIntern && !cachedKey) {
    return (
      <button
        type="button"
        onClick={() => requestKey()}
        title="Enter today's ward shift key"
        className="inline-flex items-center gap-1 rounded-lg border border-pending/40 bg-pending/10 px-2 py-1 text-xs font-medium text-ink/80 hover:border-primary/40 hover:text-primary"
      >
        <KeyIcon />
        <span>Key?</span>
      </button>
    );
  }

  return (
    <span
      title={isIntern ? "Your cached ward shift key" : "Current ward shift key"}
      className="inline-flex items-center gap-1 rounded-lg border border-primary/20 bg-primary/5 px-2 py-1 text-xs font-mono font-medium text-primary"
    >
      <KeyIcon />
      <span>{shown ?? "—"}</span>
    </span>
  );
}

function KeyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}
