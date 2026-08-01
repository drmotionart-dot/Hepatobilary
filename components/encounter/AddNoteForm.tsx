"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { apiFetch } from "@/lib/client-api";
import { ageBasedInvestigations, smokerOrders } from "@/lib/auto-triggers";

type TemplateField = {
  fieldKey: string;
  label: string;
  type: "text" | "boolean" | "select";
  options?: string[];
};

export default function AddNoteForm({ encounterId, caseType, patientAge = 0 }: { encounterId: string; caseType: string; patientAge?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState("new-case");
  const [template, setTemplate] = useState<any>(null);
  const [presentingLine, setPresentingLine] = useState("");
  const [main, setMain] = useState("");
  const [duration, setDuration] = useState("");
  const [bp, setBp] = useState("");
  const [hr, setHr] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [treatmentOrders, setTreatmentOrders] = useState("");
  const [localFields, setLocalFields] = useState<Record<string, unknown>>({});
  const [smoker, setSmoker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const auto = ageBasedInvestigations(patientAge);
  const [ecgRequired, setEcgRequired] = useState(auto.ecgRequired);
  const [echoRequired, setEchoRequired] = useState(auto.echoRequired);

  useEffect(() => {
    if (!open) return;
    setEcgRequired(auto.ecgRequired);
    setEchoRequired(auto.echoRequired);
    apiFetch(`/api/case-type-templates`).then((r) => r.json()).then((templates: any[]) => {
      const t = templates.find((x) => x.name.toLowerCase() === caseType) || templates.find((x) => x.name.toLowerCase() === "generic") || null;
      setTemplate(t);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, caseType]);

  async function handleSubmit(e: React.FormEvent) {
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
        encounterId,
        context,
        presentingLine,
        complaint: { main, duration, associated: [], pertinentNegatives: [], bowelHabit: "normal", dysuria: false, viralHepatitis: { hcv: false, hbv: false, hiv: false } },
        generalExam: { consciousness: "A", bp, hr: Number(hr) || 0, ecgRequired, ecgDone: false, echoRequired, echoDone: false },
        localExam: { templateUsed: template ? template.name.toLowerCase() : "generic", fields: localFields },
        riskFactors: { smoker },
        investigationsOrdered: [],
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
    setBp("");
    setHr("");
    setRecommendation("");
    setTreatmentOrders("");
    setLocalFields({});
    router.refresh();
  }

  if (!open) {
    return <Button size="sm" onClick={() => setOpen(true)}>+ Add note</Button>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 border-t border-border pt-4 print:hidden">
      <div className="flex gap-2">
        {["new-case", "emergency-assessment", "specialty-consult", "follow-up"].map((c) => (
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
          <Label>BP</Label>
          <Input value={bp} onChange={(e) => setBp(e.target.value)} placeholder="e.g. 120/80" />
        </div>
        <div>
          <Label>HR</Label>
          <Input type="number" value={hr} onChange={(e) => setHr(e.target.value)} />
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
