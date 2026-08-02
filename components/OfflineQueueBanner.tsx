"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { getPendingCount, isOnline, subscribe } from "@/lib/offline-queue";
import { flushOfflineQueue, initOfflineQueue } from "@/lib/client-api";
import { installDiagnostics } from "@/lib/diagnostics";

// Spec §8 "offline indicator": a small, honest, unobtrusive banner when a
// submission is queued locally rather than confirmed saved.
export default function OfflineQueueBanner() {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // App boot: start capturing JS console logs/errors for "report a problem"
    // (spec 13.x — automatic diagnostics; staff never type logs by hand).
    installDiagnostics();
    initOfflineQueue();
    const update = () => {
      setPending(getPendingCount());
      setOnline(isOnline());
    };
    update();
    const unsub = subscribe(update);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      unsub();
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const sync = useCallback(async () => {
    setSyncing(true);
    await flushOfflineQueue();
    setPending(getPendingCount());
    setOnline(isOnline());
    setSyncing(false);
  }, []);

  if (online && pending === 0) return null;

  const message = !online
    ? "You're offline — submissions are saved on this device and will sync automatically when you reconnect."
    : `${pending} submission${pending === 1 ? "" : "s"} saved on this device, waiting to sync.`;

  return (
    <div className="flex items-center justify-center gap-3 border-b border-pending/30 bg-pending/10 px-4 py-1.5 text-xs text-ink">
      <span>{message}</span>
      {online && (
        <Button size="sm" variant="secondary" onClick={sync} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync now"}
        </Button>
      )}
    </div>
  );
}
