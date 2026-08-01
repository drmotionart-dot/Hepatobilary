"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { apiFetch, safeRefresh } from "@/lib/client-api";
import { ageBasedInvestigations, smokerOrders } from "@/lib/auto-triggers";

type TemplateField = {
  fieldKey: string;
  label: string;
  type: "text" | "boolean" | "select";
  options?: string[];
};

const CONTEXTS = ["new-case", "emergency-assessment", "specialty-consult", "follow-up"];

function linesToArray(value: string) {
  return value.split("\n").map((s) => s.trim()).filter(Boolean);
}

export default function AddNoteForm({ encounterId, caseType, patientAge = 0 }: { encounterId: string; caseType: string; patientAge?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState("new-case");
  const [template, setTemplate] = useState<any>(null);
  const [presentingLine, setPresentingLine] = useState("");
  const [main, setMain] = useState("");
  const [duration, setDuration] = useState("");
  const [associated, setAssociated] = useState("");
  const [pertinentNegatives, setPertinentNegatives] = useState("");
  const [bowelHabit, setBowelHabit] = useState<"normal" | "constipation" | "diarrhea">("normal");
  const [dysuria, setDysuria] = useState(false);
  const [hcv, setHcv] = useState(false);
  const [hbv, setHbv] = useState(false);
  const [hiv, setHiv] = useState(false);
  const [pmhx, setPmhx] = useState<{ condition: string; detail: string }[]>([]);
  const [pshx, setPshx] = useState<{ procedure: string; date: string; outcome: string }[]>([]);
  const [consciousness, setConsciousness] = useState("A");
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [investigations, setInvestigations] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [treatmentOrders, setTreatmentOrders] = useState("");
  const [localFields, setLocalFields] = useState<Record<string, unknown>>({});
  const [riskFields, setRiskFields] = useState<Record<string, boolean>>({});
  const [smoker, setSmoker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const auto = ageBasedInvestigations(patientAge);
  const [ecgRequired, setEcgRequired] = useState(auto.ecgRequired);
  const [echoRequired, setEchoRequired] = useState(auto.echoRequired);
  const [ecgDone, setEcgDone] = useState(false);
  const [echoDone, setEchoDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEcgRequired(auto.ecgRequired);
    setEchoRequired(auto.echoRequired);
    apiFetch(`/api/case-type-templates`).then((r) => r.json()).then((templates: any[]) => {
      const t = templates.find((x) => x.name.toLowerCase() === caseType) || templates.find((x) => x.name.toLowerCase() === "generic") || null;
      setTemplate(t);
      if (t?.dietInstruction && !treatmentOrders.toLowerCase().includes(t.dietInstruction.toLowerCase())) {
        setTreatmentOrders((prev) => (prev ? `${prev}\nDiet: ${t.dietInstruction}` : `Diet: ${t.dietInstruction}`));
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseType]);

  function updatePmhxRow(i: number, patch: Partial<{ condition: string; detail: string }>) {
    setPmhx(pmhx.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function updatePshxRow(i: number, patch: Partial<{ procedure: string; date: string; outcome: string }>) {
    setPshx(pshx.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const orders = smokerOrders(
      linesToArray(treatmentOrders),
      smoker
    );

    const riskFactors: Record<string, unknown> = { smoker, ...riskFields };

    const res = await apiFetch("/api/clinical-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        encounterId,
        context,
        presentingLine,
        pmhx: pmhx.filter((r) => r.condition.trim()),
        pshx: pshx.map((r) => ({ ...r, date: r.date ? new Date(r.date) : null })).filter((r) => r.procedure.trim()),
        complaint: {
          main,
          duration,
          associated: linesToArray(associated),
          pertinentNegatives: linesToArray(pertinentNegatives),
          bowelHabit,
          dysuria,
          viralHepatitis: { hcv, hbv, hiv },
        },
        generalExam: { consciousness: consciousness as any, bp, hr: Number(hr) || 0, ecgRequired, ecgDone, echoRequired, echoDone },
        localExam: { templateUsed: template ? template.name.toLowerCase() : "generic", fields: localFields },
        riskFactors,
        investigationsOrdered: linesToArray(investigations),
        recommendation,
        treatmentOrders: orders,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not save note");
      return;
    }
    setOpen(false);
    setPresentingLine("");
    setMain("");
    setDuration("");
    setAssociated("");
    setPertinentNegatives("");
    setBowelHabit("normal");
    setDysuria(false);
    setHcv(false);
    setHbv(false);
    setHiv(false);
    setPmhx([]);
    setPshx([]);
    setBp("");
    setHr("");
    setInvestigations("");
    setRecommendation("");
    setTreatmentOrders("");
    setLocalFields({});
    setRiskFields({});
    setSmoker(false);
    setEcgDone(false);
    setEchoDone(false);
    safeRefresh(router, res);
  }

  if (!open) {
    return <Button size="sm" onClick={() => setOpen(true)}>+ Add note</Button>;
  }

  const riskChecklist = ((template?.riskFactorChecklist || []) as { fieldKey: string; label: string }[]).filter(
    // The dedicated Smoker checkbox below drives the auto-orders rule; don't duplicate it.
    (f) => f.fieldKey !== "smoking"
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-border pt-4 print:hidden">
      <div className="flex gap-2">
        {CONTEXTS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setContext(c)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize ${context === c ? "bg-primary text-white" : "bg-ink/5 text-muted"}`}
          >
            {c.replace("-", " ")}
          </button>
        ))}
      </div>

      <div>
        <Label>Presenting line</Label>
        <Input dir="auto" value={presentingLine} onChange={(e) => setPresentingLine(e.target.value)} placeholder="e.g. 55-year-old male with RUQ pain" />
      </div>

      <div className="rounded-lg border border-border p-3 flex flex-col gap-3">
        <p className="text-xs font-semibold text-primary uppercase">Complaint</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>Main complaint</Label>
            <Input value={main} onChange={(e) => setMain(e.target.value)} />
          </div>
          <div>
            <Label>Duration</Label>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 2 days" />
          </div>
          <div>
            <Label>Bowel habit</Label>
            <Select value={bowelHabit} onChange={(e) => setBowelHabit(e.target.value as any)}>
              <option value="normal">Normal</option>
              <option value="constipation">Constipation</option>
              <option value="diarrhea">Diarrhea</option>
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-4 pb-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={dysuria} onChange={(e) => setDysuria(e.target.checked)} />
              <span>Dysuria</span>
            </label>
            <span className="text-xs text-muted self-center">Viral hepatitis:</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hcv} onChange={(e) => setHcv(e.target.checked)} />
              <span>HCV</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hbv} onChange={(e) => setHbv(e.target.checked)} />
              <span>HBV</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hiv} onChange={(e) => setHiv(e.target.checked)} />
              <span>HIV</span>
            </label>
          </div>
          <div>
            <Label>Associated symptoms (one per line)</Label>
            <Textarea rows={2} value={associated} onChange={(e) => setAssociated(e.target.value)} placeholder="nausea, vomiting, fever…" />
          </div>
          <div>
            <Label>Pertinent negatives (one per line)</Label>
            <Textarea rows={2} value={pertinentNegatives} onChange={(e) => setPertinentNegatives(e.target.value)} placeholder="no jaundice, no melena…" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border p-3 flex flex-col gap-3">
        <p className="text-xs font-semibold text-primary uppercase">Past medical history</p>
        {pmhx.length === 0 && <p className="text-xs text-muted">No past medical history recorded.</p>}
        {pmhx.map((row, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <Input value={row.condition} onChange={(e) => updatePmhxRow(i, { condition: e.target.value })} placeholder="Condition (e.g. Diabetes, HTN)" />
            <Input value={row.detail} onChange={(e) => updatePmhxRow(i, { detail: e.target.value })} placeholder="Detail / medications" />
            <Button type="button" variant="ghost" size="sm" onClick={() => setPmhx(pmhx.filter((_, idx) => idx !== i))}>Remove</Button>
          </div>
        ))}
        <div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setPmhx([...pmhx, { condition: "", detail: "" }])}>+ Add condition</Button>
        </div>
      </div>

      <div className="rounded-lg border border-border p-3 flex flex-col gap-3">
        <p className="text-xs font-semibold text-primary uppercase">Past surgical history</p>
        {pshx.length === 0 && <p className="text-xs text-muted">No past surgical history recorded.</p>}
        {pshx.map((row, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
            <Input value={row.procedure} onChange={(e) => updatePshxRow(i, { procedure: e.target.value })} placeholder="Procedure (e.g. Cholecystectomy)" />
            <Input type="date" value={row.date} onChange={(e) => updatePshxRow(i, { date: e.target.value })} />
            <Input value={row.outcome} onChange={(e) => updatePshxRow(i, { outcome: e.target.value })} placeholder="Outcome" />
            <Button type="button" variant="ghost" size="sm" onClick={() => setPshx(pshx.filter((_, idx) => idx !== i))}>Remove</Button>
          </div>
        ))}
        <div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setPshx([...pshx, { procedure: "", date: "", outcome: "" }])}>+ Add procedure</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label>BP</Label>
          <Input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="e.g. 120/80" />
        </div>
        <div>
          <Label>HR</Label>
          <Input type="number" value={hr} onChange={(e) => setHr(e.target.value)} />
        </div>
        <div>
          <Label>Consciousness (GSR A/O/C)</Label>
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
          <input type="checkbox" checked={ecgDone} onChange={(e) => setEcgDone(e.target.checked)} />
          <span>ECG done</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={echoRequired} onChange={(e) => setEchoRequired(e.target.checked)} />
          <span>Echo required</span>
          {patientAge > 60 && <span className="text-xs text-muted">(auto — age {patientAge})</span>}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={echoDone} onChange={(e) => setEchoDone(e.target.checked)} />
          <span>Echo done</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={smoker} onChange={(e) => setSmoker(e.target.checked)} />
          <span>Smoker</span>
          {smoker && <span className="text-xs text-muted">(adds Atrovent + Pulmicort)</span>}
        </label>
        {riskChecklist.map((f) => (
          <label key={f.fieldKey} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={Boolean(riskFields[f.fieldKey])}
              onChange={(e) => setRiskFields({ ...riskFields, [f.fieldKey]: e.target.checked })}
            />
            <span>{f.label}</span>
          </label>
        ))}
      </div>

      {template && (template.leChecklist || []).length > 0 && (
        <div>
          <Label>{caseType} local-exam checklist</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {template.leChecklist.map((f: TemplateField) => (
              <div key={f.fieldKey} className="text-sm">
                <Label>{f.label}</Label>
                {f.type === "boolean" ? (
                  <Select
                    value={String(localFields[f.fieldKey] ?? "")}
                    onChange={(e) => setLocalFields({ ...localFields, [f.fieldKey]: e.target.value === "true" ? true : e.target.value === "false" ? false : "" })}
                  >
                    <option value="">—</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </Select>
                ) : f.type === "select" ? (
                  <Select value={String(localFields[f.fieldKey] ?? "")} onChange={(e) => setLocalFields({ ...localFields, [f.fieldKey]: e.target.value })}>
                    <option value="">—</option>
                    {(f.options || []).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </Select>
                ) : (
                  <Input value={String(localFields[f.fieldKey] ?? "")} onChange={(e) => setLocalFields({ ...localFields, [f.fieldKey]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <Label>Investigations ordered (one per line)</Label>
        <Textarea rows={2} value={investigations} onChange={(e) => setInvestigations(e.target.value)} placeholder="CBC, LFTs, Ultrasound abdomen…" />
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
        <Button type="submit" loading={loading}>{loading ? "Saving…" : "Save note"}</Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
