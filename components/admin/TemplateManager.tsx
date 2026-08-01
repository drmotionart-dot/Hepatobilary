"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";
import { apiFetch } from "@/lib/client-api";

type Template = any;

export default function TemplateManager({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingActive, setEditingActive] = useState(true);
  const [name, setName] = useState("");
  const [labPanelPreset, setLabPanelPreset] = useState("");
  const [dietInstruction, setDietInstruction] = useState("");
  const [leFields, setLeFields] = useState<string[]>([]);
  const [leLabels, setLeLabels] = useState<Record<string, string>>({});
  const [riskFields, setRiskFields] = useState<string[]>([]);
  const [leOriginal, setLeOriginal] = useState<Record<string, { type: string; options?: string[] }>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setEditingId(null);
    setName("");
    setLabPanelPreset("");
    setDietInstruction("");
    setLeFields([]);
    setLeLabels({});
    setRiskFields([]);
    setLeOriginal({});
  }

  function startEdit(t: Template) {
    setEditingId(t._id);
    setEditingActive(Boolean(t.active));
    setName(t.name || "");
    setLabPanelPreset((t.labPanelPreset || []).join("\n"));
    setDietInstruction(t.dietInstruction || "");
    setLeFields((t.leChecklist || []).map((f: any) => f.fieldKey));
    setLeLabels(Object.fromEntries((t.leChecklist || []).map((f: any) => [f.fieldKey, f.label])));
    setRiskFields((t.riskFactorChecklist || []).map((f: any) => f.fieldKey));
    setLeOriginal(Object.fromEntries((t.leChecklist || []).map((f: any) => [f.fieldKey, { type: f.type, options: f.options }])));
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const leChecklist = leFields.map((f) => {
      const orig = leOriginal[f];
      return {
        fieldKey: f,
        label: leLabels[f] || f,
        type: orig?.type || "boolean",
        ...(orig?.type === "select" && orig.options ? { options: orig.options } : {}),
      };
    });

    const payload = {
      name,
      leChecklist,
      riskFactorChecklist: riskFields.map((f) => ({ fieldKey: f, label: f })),
      labPanelPreset: labPanelPreset.split("\n").map((s) => s.trim()).filter(Boolean),
      dietInstruction,
      ...(editingId ? { active: editingActive } : {}),
    };

    const res = editingId
      ? await apiFetch(`/api/case-type-templates/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await apiFetch("/api/case-type-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not save template");
      return;
    }
    resetForm();
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <Card title={editingId ? "Edit case type template" : "Create a case type template"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label>Name (e.g. Hernia, Biliary, Hepatic, Generic)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <Label>Local-exam checklist (one key per line, e.g. reducible)</Label>
            <Textarea
              rows={2}
              value={leFields.join("\n")}
              onChange={(e) => setLeFields(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
              placeholder={"reducible\nMRLH_side\nstrangulated"}
            />
          </div>

          <div>
            <Label>Risk factor checklist (one per line)</Label>
            <Textarea
              rows={2}
              value={riskFields.join("\n")}
              onChange={(e) => setRiskFields(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))}
              placeholder={"Smoking\nDiabetes\nHypertension"}
            />
          </div>

          <div>
            <Label>Lab panel preset (one test per line)</Label>
            <Textarea rows={2} value={labPanelPreset} onChange={(e) => setLabPanelPreset(e.target.value)} placeholder={"CBC\nSGPT\nCreatinine"} />
          </div>

          <div>
            <Label>Diet instruction</Label>
            <Input value={dietInstruction} onChange={(e) => setDietInstruction(e.target.value)} />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" loading={loading}>{loading ? "Saving…" : editingId ? "Save changes" : "Create template"}</Button>
            {editingId && (
              <Button variant="ghost" onClick={() => { resetForm(); setError(""); }}>Cancel edit</Button>
            )}
          </div>
        </form>
      </Card>

      <Card title={`Templates (${templates.length})`}>
        <ul className="flex flex-col divide-y divide-border">
          {templates.map((t) => (
            <li key={t._id} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold min-w-0">{t.name}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={t.active ? "success" : "default"}>{t.active ? "active" : "inactive"}</Badge>
                  <Button size="sm" variant="secondary" onClick={() => startEdit(t)}>Edit</Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await apiFetch(`/api/case-type-templates/${t._id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ active: !t.active }),
                      });
                      router.refresh();
                    }}
                  >
                    {t.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted mt-1">
                {t.leChecklist?.length || 0} LE fields · {t.riskFactorChecklist?.length || 0} risk factors ·{" "}
                {t.labPanelPreset?.length || 0} lab presets
              </p>
              {t.dietInstruction && <p className="text-xs text-muted mt-0.5">Diet: {t.dietInstruction}</p>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
