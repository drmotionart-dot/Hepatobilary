"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

const MODALITIES = ["CT", "US", "Doppler", "MRI", "X-ray", "Mammography"];

export default function AddImagingForm({ encounterId }: { encounterId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modality, setModality] = useState("CT");
  const [modalityDetail, setModalityDetail] = useState("");
  const [clinicalDiagnosis, setClinicalDiagnosis] = useState("");
  const [pertinentClinicalData, setPertinentClinicalData] = useState("");
  const [partToBeExamined, setPartToBeExamined] = useState("");
  const [aimOfExamination, setAimOfExamination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/imaging-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encounterId, modality, modalityDetail, clinicalDiagnosis, pertinentClinicalData, partToBeExamined, aimOfExamination }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not request imaging");
      return;
    }
    setOpen(false);
    setPartToBeExamined("");
    router.refresh();
  }

  if (!open) return <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>+ Request imaging</Button>;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-black/10 pt-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>Modality</Label>
          <Select value={modality} onChange={(e) => setModality(e.target.value)}>
            {MODALITIES.map((m) => <option key={m}>{m}</option>)}
          </Select>
        </div>
        <div>
          <Label>Modality detail</Label>
          <Input value={modalityDetail} onChange={(e) => setModalityDetail(e.target.value)} placeholder="e.g. triphasic, with contrast" />
        </div>
        <div>
          <Label>Part to be examined</Label>
          <Input value={partToBeExamined} onChange={(e) => setPartToBeExamined(e.target.value)} placeholder="e.g. abdomen & pelvis" required />
        </div>
        <div>
          <Label>Clinical diagnosis</Label>
          <Input value={clinicalDiagnosis} onChange={(e) => setClinicalDiagnosis(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Pertinent clinical data</Label>
        <Textarea rows={2} value={pertinentClinicalData} onChange={(e) => setPertinentClinicalData(e.target.value)} />
      </div>
      <div>
        <Label>Aim of examination</Label>
        <Textarea rows={2} value={aimOfExamination} onChange={(e) => setAimOfExamination(e.target.value)} />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Request"}</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
