"use client";

// Attendance record (spec 11.8). Mark present/absent per day, upserted by
// (user, date). Residents and admins both run this panel.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Label } from "@/components/ui/Label";
import { apiFetch } from "@/lib/client-api";
import { localDateKey } from "@/lib/constants";
import type { Attendance } from "@/lib/models/types";

export default function AttendancePanel({ userId, records }: { userId: string; records: Attendance[] }) {
  const router = useRouter();
  const [date, setDate] = useState(localDateKey(new Date()));
  const [status, setStatus] = useState<"present" | "absent">("present");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, date, status, note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Could not save attendance mark");
        return;
      }
      setNote("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Date</Label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <Label>Status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "present" | "absent")}
            className="mt-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
        </div>
        <div className="flex-1 min-w-40">
          <Label>Note <span className="text-muted">(optional)</span></Label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. On-call / leave / half-day…"
            className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Button type="submit" size="sm" loading={loading}>
          {loading ? "Saving…" : "Mark"}
        </Button>
      </form>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}

      {records.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No attendance marks yet.</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {records.map((r) => (
            <li key={r._id?.toString() || `${r.date}-${r.status}`} className="py-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{r.date instanceof Date ? r.date.toLocaleDateString("en-GB") : String(r.date).slice(0, 10)}</p>
                {r.note && <p className="text-xs text-muted">{r.note}</p>}
              </div>
              <Badge tone={r.status === "present" ? "success" : "danger"}>{r.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
