"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { CASE_TYPES } from "@/lib/constants";
import { apiFetch } from "@/lib/client-api";

type Patient = { _id: string; medicalNumber: string; fullName: string; age: number; sex: string };

export default function NewCaseForm() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);

  const [medicalNumber, setMedicalNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [caseType, setCaseType] = useState("hernia");
  const [customCaseTypeLabel, setCustomCaseTypeLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    setSearched(true);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const res = await apiFetch(`/api/patients?q=${encodeURIComponent(q)}`);
    if (res.ok) setResults(await res.json());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    let patientId = selected?._id;
    if (!patientId) {
      const pRes = await apiFetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicalNumber, fullName, age: Number(age), sex }),
      });
      if (!pRes.ok) {
        const d = await pRes.json();
        setError(d.error || "Could not create patient");
        setLoading(false);
        return;
      }
      const p = await pRes.json();
      patientId = p._id;
    }

    const eRes = await apiFetch("/api/encounters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId,
        type: "clinic",
        caseType,
        status: "active",
        ...(caseType === "custom" ? { customCaseTypeLabel: customCaseTypeLabel.trim() } : {}),
      }),
    });
    setLoading(false);

    if (!eRes.ok) {
      const d = await eRes.json();
      setError(d.error || "Could not open case");
      return;
    }
    const enc = await eRes.json();
    router.push(`/clinic/${enc._id}?fresh=1`);
    router.refresh();
  }

  return (
    <Card title="Open a new clinic case">
      {/* Step 1: find existing patient */}
      <form onSubmit={search} className="flex gap-2 mb-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by medical number or name…"
        />
        <Button type="submit" variant="secondary" size="sm">Search</Button>
      </form>

      {searched && (
        <div className="mb-3">
          {results.length === 0 ? (
            <p className="text-xs text-muted">No matching patient. Fill the details below to create one.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {results.map((p) => (
                <li key={p._id} className="py-2">
                  <button
                    type="button"
                    onClick={() => setSelected(selected?._id === p._id ? null : p)}
                    className={`w-full text-left px-2 py-1 rounded-md text-sm ${selected?._id === p._id ? "bg-primary/10" : "hover:bg-ink/5"}`}
                  >
                    <span className="font-medium" dir="auto">{p.fullName}</span>
                    <span className="text-muted ml-2">{p.medicalNumber} · {p.age}y · {p.sex}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Step 2: patient details (prefilled for selected) or new */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {selected ? (
          <div className="rounded-lg bg-primary/5 p-3 text-sm">
            <p className="font-medium" dir="auto">{selected.fullName}</p>
            <p className="text-muted text-xs mt-0.5">{selected.medicalNumber} — using existing patient record</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Medical number *</Label>
              <Input value={medicalNumber} onChange={(e) => setMedicalNumber(e.target.value)} required />
            </div>
            <div className="col-span-2">
              <Label>Full name *</Label>
              <Input dir="auto" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <Label>Age *</Label>
              <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} required />
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

        <div>
          <Label>Case type</Label>
          <Select value={caseType} onChange={(e) => setCaseType(e.target.value)}>
            {CASE_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </div>

        {caseType === "custom" && (
          <div>
            <Label>Name for this case *</Label>
            <Input value={customCaseTypeLabel} onChange={(e) => setCustomCaseTypeLabel(e.target.value)} placeholder="e.g. Appendicitis, Trauma, Liver abscess…" required />
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <Button type="submit" loading={loading}>
          {loading ? "Opening…" : "Open case & write note"}
        </Button>
      </form>
    </Card>
  );
}
