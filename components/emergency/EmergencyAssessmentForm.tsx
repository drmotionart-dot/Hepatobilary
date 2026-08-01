"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { CASE_TYPES } from "@/lib/constants";
import { apiFetch } from "@/lib/client-api";
import { smokerOrders } from "@/lib/auto-triggers";

export default function EmergencyAssessmentForm() {
  const router = useRouter();
  const [step, setStep] = useState<"patient" | "note">("patient");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  const [medicalNumber, setMedicalNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [caseType, setCaseType] = useState("hernia");
  const [customCaseTypeLabel, setCustomCaseTypeLabel] = useState("");
  const [ward, setWard] = useState("male");

  const [presentingLine, setPresentingLine] = useState("");
  const [main, setMain] = useState("");
  const [duration, setDuration] = useState("");
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [consciousness, setConsciousness] = useState("A");
  const [recommendation, setRecommendation] = useState("");
  const [treatmentOrders, setTreatmentOrders] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [patientAge, setPatientAge] = useState(0);
  const [ecgRequired, setEcgRequired] = useState(false);
  const [echoRequired, setEchoRequired] = useState(false);
  const [smoker, setSmoker] = useState(false);

  useEffect(() => {
    if (step === "note") {
      setEcgRequired(patientAge > 40);
      setEchoRequired(patientAge > 60);
    }
  }, [step, patientAge]);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (!q.trim()) return;
    const res = await apiFetch(`/api/patients?q=${encodeURIComponent(q)}`);
    if (res.ok) setResults(await res.json());
  }

  async function openEncounter(patientId: string) {
    setError("");
    setLoading(true);
    const eRes = await apiFetch("/api/encounters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        type: "emergency",
        caseType,
        status: "active",
        ward,
        ...(caseType === "custom" ? { customCaseTypeLabel: customCaseTypeLabel.trim() } : {}),
      }),
    });
    setLoading(false);

    if (!eRes.ok) {
      const d = await eRes.json();
      setError(d.error || "Could not open encounter");
      return null;
    }
    return (await eRes.json()) as { _id: string };
  }

  async function handlePatientNext() {
    setError("");
    if (selected) {
      setPatientAge(selected.age || 0);
      const enc = await openEncounter(selected._id);
      if (enc) {
        setSelected(enc);
        setStep("note");
      }
      return;
    }

    setLoading(true);
    const pRes = await apiFetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medicalNumber, fullName, age: Number(age), sex }),
    });
    setLoading(false);
    if (!pRes.ok) {
      const d = await pRes.json();
      setError(d.error || "Could not create patient");
      return;
    }
    const p = await pRes.json();
    setPatientAge(Number(age));
    const enc = await openEncounter(p._id);
    if (enc) {
      setSelected(enc);
      setStep("note");
    }
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const orders = smokerOrders(
      treatmentOrders.split("\n").map((s) => s.trim()).filter(Boolean),
      smoker
    );

    const res = await apiFetch("/api/clinical-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encounterId: selected._id,
        context: "emergency-assessment",
        presentingLine,
        complaint: { main, duration, associated: [], pertinentNegatives: [], bowelHabit: "normal", dysuria: false, viralHepatitis: { hcv: false, hbv: false, hiv: false } },
        generalExam: { consciousness, bp, hr: Number(hr) || 0, ecgRequired, ecgDone: false, echoRequired, echoDone: false },
        localExam: { templateUsed: caseType === "custom" ? "generic" : caseType, fields: {} },
        riskFactors: { smoker },
        investigationsOrdered: [],
        recommendation,
        treatmentOrders: orders,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not save assessment");
      return;
    }
    router.push(`/ward/${selected._id}`);
    router.refresh();
  }

  if (step === "note") {
    return (
      <Card title="Emergency assessment">
        <form onSubmit={submitNote} className="flex flex-col gap-3">
          <div>
            <Label>Presenting line</Label>
            <Input dir="auto" value={presentingLine} onChange={(e) => setPresentingLine(e.target.value)} placeholder="e.g. 60-year-old male, sudden RUQ pain" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Main complaint</Label>
              <Input value={main} onChange={(e) => setMain(e.target.value)} />
            </div>
            <div>
              <Label>Duration</Label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div>
              <Label>BP</Label>
              <Input value={bp} onChange={(e) => setBp(e.target.value)} />
            </div>
            <div>
              <Label>HR</Label>
              <Input type="number" value={hr} onChange={(e) => setHr(e.target.value)} />
            </div>
            <div>
              <Label>Consciousness</Label>
              <Select value={consciousness} onChange={(e) => setConsciousness(e.target.value)}>
                <option value="A">Alert</option>
                <option value="confused">Confused</option>
                <option value="obtunded">Obtunded</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg bg-ink/[0.03] p-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={ecgRequired} onChange={(e) => setEcgRequired(e.target.checked)} />
              <span>ECG required</span>
              {patientAge > 40 && <span className="text-xs text-muted">(auto — age {patientAge})</span>}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={echoRequired} onChange={(e) => setEchoRequired(e.target.checked)} />
              <span>Echo required</span>
              {patientAge > 60 && <span className="text-xs text-muted">(auto — age {patientAge})</span>}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={smoker} onChange={(e) => setSmoker(e.target.checked)} />
              <span>Smoker</span>
              {smoker && <span className="text-xs text-muted">(adds Atrovent + Pulmicort)</span>}
            </label>
          </div>
          <div>
            <Label>Recommendation</Label>
            <Textarea rows={2} value={recommendation} onChange={(e) => setRecommendation(e.target.value)} />
          </div>
          <div>
            <Label>Treatment orders (one per line)</Label>
            <Textarea rows={2} dir="auto" value={treatmentOrders} onChange={(e) => setTreatmentOrders(e.target.value)} />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" loading={loading}>{loading ? "Saving…" : "Save assessment"}</Button>
            <Button variant="ghost" onClick={() => setStep("patient")}>Back</Button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card title="New emergency case">
      <form onSubmit={search} className="flex gap-2 mb-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by medical number or name…" />
        <Button type="submit" variant="secondary" size="sm">Search</Button>
      </form>

      {results.length > 0 && (
        <ul className="flex flex-col divide-y divide-border mb-3">
          {results.map((p) => (
            <li key={p._id} className="py-2">
              <button
                type="button"
                onClick={() => setSelected(selected?._id === p._id ? null : p)}
                className={`w-full text-left px-2 py-1 rounded-md text-sm ${selected?._id === p._id ? "bg-primary/10" : "hover:bg-ink/5"}`}
              >
                <span className="font-medium" dir="auto">{p.fullName}</span>
                <span className="text-muted ml-2">{p.medicalNumber} · {p.age}y</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3">
        {!selected && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Medical number *</Label>
              <Input value={medicalNumber} onChange={(e) => setMedicalNumber(e.target.value)} required />
            </div>
            <div>
              <Label>Age *</Label>
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} required />
            </div>
            <div className="col-span-2">
              <Label>Full name *</Label>
              <Input dir="auto" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label>Sex</Label>
              <Select value={sex} onChange={(e) => setSex(e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Select>
            </div>
          </div>
        )}

        {selected && (
          <div className="rounded-lg bg-primary/5 p-3 text-sm">
            <p className="font-medium" dir="auto">{selected.fullName}</p>
            <p className="text-muted text-xs mt-0.5">{selected.medicalNumber} — existing patient</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Case type</Label>
            <Select value={caseType} onChange={(e) => setCaseType(e.target.value)}>
              {CASE_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </div>
          <div>
            <Label>Admit to ward</Label>
            <Select value={ward} onChange={(e) => setWard(e.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
          </div>
        </div>

        {caseType === "custom" && (
          <div>
            <Label>Name for this case *</Label>
            <Input value={customCaseTypeLabel} onChange={(e) => setCustomCaseTypeLabel(e.target.value)} placeholder="e.g. Appendicitis, Trauma, Liver abscess…" required />
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <Button onClick={handlePatientNext} loading={loading}>
          {loading ? "Opening…" : "Next — write assessment"}
        </Button>
      </div>
    </Card>
  );
}
