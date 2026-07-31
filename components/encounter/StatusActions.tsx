"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";

export default function StatusActions({ encounterId }: { encounterId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "discharge" | "follow-up" | "close" | "refer-out">("none");
  const [summary, setSummary] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [referSpecialty, setReferSpecialty] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "discharge") {
      const res = await fetch("/api/discharge-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encounterId,
          summary,
          followUpRequired: followUpInstructions.trim().length > 0,
          followUpInstructions: followUpInstructions.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Could not save discharge");
        setLoading(false);
        return;
      }
      await fetch(`/api/encounters/${encounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: followUpInstructions.trim() ? "follow-up-pending" : "discharged" }),
      });
    } else if (mode === "follow-up") {
      await fetch(`/api/encounters/${encounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "follow-up-pending" }),
      });
    } else if (mode === "close") {
      await fetch(`/api/encounters/${encounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
    } else if (mode === "refer-out") {
      const res = await fetch("/api/referral-consults", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encounterId, toSpecialty: referSpecialty, reason: summary }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Could not create referral");
        setLoading(false);
        return;
      }
      await fetch(`/api/encounters/${encounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "referred-out" }),
      });
    }

    setLoading(false);
    router.refresh();
  }

  const actions = [
    { key: "discharge" as const, label: "Discharge" },
    { key: "follow-up" as const, label: "Follow-up" },
    { key: "close" as const, label: "Close case" },
    { key: "refer-out" as const, label: "Refer out" },
  ];

  return (
    <Card>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.key}
            variant={mode === a.key ? "primary" : "secondary"}
            size="sm"
            onClick={() => {
              setMode(mode === a.key ? "none" : a.key);
              setError("");
            }}
          >
            {a.label}
          </Button>
        ))}
      </div>

      {mode !== "none" && (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {mode === "refer-out" && (
            <div>
              <Label>Specialty to refer to</Label>
              <input
                className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={referSpecialty}
                onChange={(e) => setReferSpecialty(e.target.value)}
                required
              />
            </div>
          )}
          {mode !== "close" && (
            <div>
              <Label>{mode === "discharge" ? "Discharge summary" : mode === "refer-out" ? "Reason" : "Follow-up plan"}</Label>
              <Textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={mode === "discharge" ? "Summary of admission, treatment, and status at discharge…" : mode === "refer-out" ? "Why is this patient being referred?" : "What needs to be followed up and when?"}
                required
              />
            </div>
          )}
          {mode === "discharge" && (
            <div>
              <Label>Follow-up required?</Label>
              <Textarea
                rows={2}
                value={followUpInstructions}
                onChange={(e) => setFollowUpInstructions(e.target.value)}
                placeholder="Optional — if filled, the case moves to the follow-up queue"
              />
            </div>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving…" : "Confirm"}
            </Button>
            <Button variant="ghost" onClick={() => setMode("none")}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
