"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { apiFetch } from "@/lib/client-api";

type StatusProps = {
  encounterId: string;
  encounterType?: string;
  encounterStatus?: string;
  patientId?: string;
  caseType?: string;
  customCaseTypeLabel?: string | null;
};

type Mode =
  | "none"
  | "admit"
  | "discharge"
  | "follow-up"
  | "close"
  | "refer-out"
  | "escalate"
  | "open-follow-up";

export default function StatusActions({
  encounterId,
  encounterType,
  encounterStatus = "active",
  patientId,
  caseType = "custom",
  customCaseTypeLabel,
}: StatusProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("none");
  const [ward, setWard] = useState("male");
  const [summary, setSummary] = useState("");
  const [followUpInstructions, setFollowUpInstructions] = useState("");
  const [referSpecialty, setReferSpecialty] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "admit") {
      // Spec §4.1 step 3: admit SPAWNS a new ward encounter linked to the same
      // patient and closes the source encounter. The backend handles the spawn.
      const res = await apiFetch(`/api/encounters/${encounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admit", ward }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Could not admit to ward");
        setLoading(false);
        return;
      }
    } else if (mode === "discharge") {
      const res = await apiFetch("/api/discharge-forms", {
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
      await apiFetch(`/api/encounters/${encounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: followUpInstructions.trim() ? "follow-up-pending" : "discharged" }),
      });
    } else if (mode === "follow-up") {
      await apiFetch(`/api/encounters/${encounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "follow-up-pending" }),
      });
    } else if (mode === "close") {
      await apiFetch(`/api/encounters/${encounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed" }),
      });
    } else if (mode === "refer-out") {
      const res = await apiFetch("/api/referral-consults", {
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
      await apiFetch(`/api/encounters/${encounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "referred-out" }),
      });
    } else if (mode === "escalate") {
      // Spec §4.1 step 5: clinic → emergency escalation without re-entering data.
      const res = await apiFetch(`/api/encounters/${encounterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "emergency" }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Could not escalate to emergency");
        setLoading(false);
        return;
      }
    } else if (mode === "open-follow-up") {
      // Open a follow-up VISIT: a new clinic encounter linked to this prior
      // discharge (spec §4 / line 93), reusing the same case type.
      const res = await apiFetch("/api/encounters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          type: "clinic",
          caseType,
          customCaseTypeLabel,
          linkedFollowUpOf: encounterId,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Could not open follow-up visit");
        setLoading(false);
        return;
      }
      const created = await res.json();
      setLoading(false);
      router.push(`/ward/${created._id}`);
      return;
    }

    setLoading(false);
    router.refresh();
  }

  const isFollowUpPending = encounterStatus === "follow-up-pending";
  const isActive = encounterStatus === "active";

  const actions: { key: Mode; label: string }[] = [];
  if (isActive) {
    if (encounterType !== "ward") actions.push({ key: "admit", label: "Admit to ward" });
    actions.push({ key: "discharge", label: "Discharge" });
    actions.push({ key: "follow-up", label: "Follow-up" });
    actions.push({ key: "close", label: "Close case" });
    actions.push({ key: "refer-out", label: "Refer out" });
    if (encounterType === "clinic") actions.push({ key: "escalate", label: "Escalate to ER" });
  } else if (isFollowUpPending) {
    actions.push({ key: "open-follow-up", label: "Open follow-up visit" });
    actions.push({ key: "close", label: "Close follow-up" });
  }

  return (
    <Card className="print:hidden">
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
          {mode === "admit" && (
            <div>
              <Label>Admit to</Label>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
              >
                <option value="male">Male ward</option>
                <option value="female">Female ward</option>
              </select>
              <p className="mt-1 text-xs text-muted">Admitting spawns a new ward encounter for this patient and closes this {encounterType} encounter.</p>
            </div>
          )}
          {mode === "refer-out" && (
            <div>
              <Label>Specialty to refer to</Label>
              <input
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={referSpecialty}
                onChange={(e) => setReferSpecialty(e.target.value)}
                required
              />
            </div>
          )}
          {mode !== "close" && mode !== "admit" && mode !== "escalate" && mode !== "open-follow-up" && (
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
          {mode === "escalate" && (
            <p className="text-xs text-muted">This clinic encounter will be escalated to the emergency stream. Patient data stays as-is.</p>
          )}
          {mode === "open-follow-up" && (
            <p className="text-xs text-muted">A new clinic encounter will be opened for this patient, linked to this follow-up.</p>
          )}

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" loading={loading}>
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
