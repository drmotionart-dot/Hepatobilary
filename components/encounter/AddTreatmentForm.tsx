"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { apiFetch, safeRefresh } from "@/lib/client-api";

export default function AddTreatmentForm({ encounterId }: { encounterId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [treatment, setTreatment] = useState("");
  const [otherRecommendations, setOtherRecommendations] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await apiFetch("/api/treatment-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encounterId, treatment, otherRecommendations, date: date || undefined }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not log treatment");
      return;
    }
    setOpen(false);
    setTreatment("");
    setOtherRecommendations("");
    safeRefresh(router, res);
  }

  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>+ Log treatment</Button>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-border pt-4 print:hidden">
      <div>
        <Label>Treatment</Label>
        <Input value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="e.g. IV fluids, antibiotics" required />
      </div>
      <div>
        <Label>Other recommendations</Label>
        <Textarea rows={2} value={otherRecommendations} onChange={(e) => setOtherRecommendations(e.target.value)} />
      </div>
      <div>
        <Label>Date</Label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" loading={loading}>{loading ? "Saving…" : "Log"}</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
