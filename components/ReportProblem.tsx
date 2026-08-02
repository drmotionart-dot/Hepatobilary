"use client";

// "Report a problem" (top-bar, every authenticated page). Deliberately
// low-friction: one textarea, no shift-key gate. Context (page URL, user,
// role, time, correlation id) is captured automatically. If the app is offline
// the report is queued and replayed like any other mutation.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { apiFetch, getCorrelationId, isQueuedResponse } from "@/lib/client-api";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  resident: "Resident",
  intern: "Intern",
};

type UserInfo = { name?: string; email?: string; role: string };

export default function ReportProblem({ user }: { user: UserInfo | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ id: string; queued: boolean } | null>(null);

  const context = {
    url: typeof window !== "undefined" ? window.location.href : "",
    time: new Date().toLocaleString("en-GB", { hour12: true }),
    correlationId: getCorrelationId(),
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await apiFetch("/api/problem-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          url: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      if (isQueuedResponse(res)) {
        setDone({ id: "", queued: true });
        router.refresh();
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Could not send the report.");
        return;
      }
      const d = await res.json();
      setDone({ id: d._id?.toString() || "", queued: false });
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setOpen(false);
    setDescription("");
    setError("");
    setDone(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Report a problem"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5 text-sm text-ink/70 transition-colors hover:bg-danger/10 hover:text-danger"
      >
        <IconBug />
        <span className="hidden sm:inline">Report</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label="Report a problem">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg max-h-[calc(100vh-2rem)] overflow-y-auto">
            {done ? (
              <>
                <h3 className="text-base font-semibold text-success">
                  {done.queued ? "Report saved offline" : "Thanks — report sent"}
                </h3>
                <p className="mt-1 text-sm text-ink/80">
                  {done.queued
                    ? "You're offline, so the report is stored on this device and will be sent automatically when you reconnect."
                    : done.id
                      ? `Report #${done.id} is with the admin team.`
                      : "Your report is with the admin team."}
                </p>
                <div className="mt-4">
                  <Button onClick={close}>Done</Button>
                </div>
              </>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3">
                <h3 className="text-base font-semibold">Report a problem</h3>
                <div>
                  <Label>What went wrong?</Label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    maxLength={2000}
                    placeholder="Describe the issue and what you expected to happen…"
                    dir="auto"
                    className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="rounded-lg border border-border bg-bg/60 p-3 text-xs text-muted">
                  <p>
                    <span className="font-medium text-ink/70">Page:</span> <span className="break-all" dir="ltr">{context.url}</span>
                  </p>
                  <p className="mt-1">
                    <span className="font-medium text-ink/70">User:</span> {user?.name || "—"} · {ROLE_LABELS[user?.role || ""] || user?.role || "—"}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium text-ink/70">Time:</span> {context.time} · <span className="font-mono">#{context.correlationId.slice(-8)}</span>
                  </p>
                </div>
                {error && <p className="text-xs text-danger">{error}</p>}
                <div className="flex gap-2">
                  <Button type="submit" loading={submitting} disabled={!description.trim()}>
                    {submitting ? "Sending…" : "Send report"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={close}>
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function IconBug() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="14" x="8" y="2" rx="4" />
      <path d="m4 6 3 3M20 6l-3 3M4 18l3-3M20 18l-3-3" />
      <path d="M8 8h.01M12 8h.01M16 8h.01" />
      <path d="M12 8v6M9 12h6" />
    </svg>
  );
}
