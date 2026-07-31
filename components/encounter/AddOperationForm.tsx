"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { apiFetch } from "@/lib/client-api";
import type { OperationForm } from "@/lib/models/types";

type User = { _id: string; fullName: string; role: string };

const toDateInput = (d?: Date | string | null) => {
  if (!d) return new Date().toISOString().slice(0, 10);
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return new Date().toISOString().slice(0, 10);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

export default function AddOperationForm({
  encounterId,
  patientNo,
  existing,
}: {
  encounterId: string;
  patientNo: string;
  existing?: OperationForm | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const [date, setDate] = useState(() => toDateInput(existing?.date));
  const [procedureName, setProcedureName] = useState(existing?.procedureName || "");
  const [preOpDiagnosis, setPreOpDiagnosis] = useState(existing?.preOpDiagnosis || "");
  const [postOpDiagnosis, setPostOpDiagnosis] = useState(existing?.postOpDiagnosis || "");
  const [anesthesiaType, setAnesthesiaType] = useState(existing?.anesthesiaType || "");
  const [anesthetist, setAnesthetist] = useState(existing?.anesthetist || "");
  const [findings, setFindings] = useState(existing?.findings || "");
  const [procedureDetails, setProcedureDetails] = useState(existing?.procedureDetails || "");
  const [specimens, setSpecimens] = useState((existing?.specimensSent || []).join("\n"));
  const [estimatedBloodLoss, setEstimatedBloodLoss] = useState(existing?.estimatedBloodLoss || "");
  const [complications, setComplications] = useState(existing?.complications || "");
  const [postOpPlan, setPostOpPlan] = useState(existing?.postOpPlan || "");
  const [assistants, setAssistants] = useState<string[]>(() =>
    (existing?.assistants || []).map((a) => a.toString())
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    apiFetch("/api/users")
      .then((res) => (res.ok ? res.json() : []))
      .then((list: User[]) => setUsers(list || []))
      .catch(() => {});
  }, [open]);

  function toggleAssistant(id: string) {
    setAssistants((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const editable = {
      procedureName: procedureName.trim(),
      preOpDiagnosis: preOpDiagnosis.trim(),
      postOpDiagnosis: postOpDiagnosis.trim(),
      anesthesiaType: anesthesiaType.trim(),
      anesthetist,
      findings: findings.trim(),
      procedureDetails: procedureDetails.trim(),
      specimensSent: specimens.split("\n").map((s) => s.trim()).filter(Boolean),
      estimatedBloodLoss: estimatedBloodLoss.trim(),
      complications: complications.trim(),
      postOpPlan: postOpPlan.trim(),
      assistants,
      date,
    };

    const res = existing?._id
      ? await apiFetch(`/api/operation-forms/${existing._id.toString()}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editable),
        })
      : await apiFetch("/api/operation-forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...editable, encounterId, patientNo }),
        });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not save operation record");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {existing ? "Edit operation record" : "+ Complete operation record"}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-black/10 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Procedure name *</Label>
          <Input value={procedureName} onChange={(e) => setProcedureName(e.target.value)} placeholder="e.g. Laparoscopic cholecystectomy" required />
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>Pre-op diagnosis</Label>
          <Input value={preOpDiagnosis} onChange={(e) => setPreOpDiagnosis(e.target.value)} />
        </div>
        <div>
          <Label>Post-op diagnosis</Label>
          <Input value={postOpDiagnosis} onChange={(e) => setPostOpDiagnosis(e.target.value)} />
        </div>
        <div>
          <Label>Anesthesia type</Label>
          <Input value={anesthesiaType} onChange={(e) => setAnesthesiaType(e.target.value)} placeholder="e.g. General" />
        </div>
        <div>
          <Label>Anesthetist</Label>
          <Select value={anesthetist} onChange={(e) => setAnesthetist(e.target.value)}>
            <option value="">—</option>
            {users.map((u) => (
              <option key={u._id} value={u.fullName}>{u.fullName}</option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label>Assistants</Label>
        {users.length === 0 ? (
          <p className="text-xs text-ink/50">No staff users available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-1">
            {users.map((u) => (
              <label key={u._id} className="flex items-center gap-2 text-sm rounded-md px-2 py-1 hover:bg-black/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assistants.includes(u._id)}
                  onChange={() => toggleAssistant(u._id)}
                  className="accent-[color:var(--primary)]"
                />
                {u.fullName}
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label>Findings</Label>
        <Textarea rows={2} value={findings} onChange={(e) => setFindings(e.target.value)} />
      </div>
      <div>
        <Label>Procedure details</Label>
        <Textarea rows={2} value={procedureDetails} onChange={(e) => setProcedureDetails(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Estimated blood loss</Label>
          <Input value={estimatedBloodLoss} onChange={(e) => setEstimatedBloodLoss(e.target.value)} placeholder="e.g. 200 ml" />
        </div>
        <div>
          <Label>Complications</Label>
          <Input value={complications} onChange={(e) => setComplications(e.target.value)} placeholder="None if none" />
        </div>
      </div>
      <div>
        <Label>Specimens sent (one per line)</Label>
        <Textarea rows={2} value={specimens} onChange={(e) => setSpecimens(e.target.value)} placeholder="e.g. gallbladder for histopathology" />
      </div>
      <div>
        <Label>Post-op plan</Label>
        <Textarea rows={2} value={postOpPlan} onChange={(e) => setPostOpPlan(e.target.value)} />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save operation record"}</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
