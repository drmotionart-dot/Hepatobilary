"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";

export default function TemplateManager({ templates }: { templates: any[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [labPanelPreset, setLabPanelPreset] = useState("");
  const [dietInstruction, setDietInstruction] = useState("");
  const [leFields, setLeFields] = useState<string[]>([]);
  const [leLabels, setLeLabels] = useState<Record<string, string>>({});
  const [riskFields, setRiskFields] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createTemplate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const leChecklist = leFields.map((f) => ({
      fieldKey: f,
      label: leLabels[f] || f,
      type: "boolean" as const,
    }));

    const res = await fetch("/api/case-type-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        leChecklist,
        riskFactorChecklist: riskFields.map((f) => ({ fieldKey: f, label: f })),
        labPanelPreset: labPanelPreset.split("\n").map((s) => s.trim()).filter(Boolean),
        dietInstruction,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not create template");
      return;
    }
    setName("");
    setLabPanelPreset("");
    setDietInstruction("");
    setLeFields([]);
    setRiskFields([]);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <Card title="Create a case type template">
        <form onSubmit={createTemplate} className="flex flex-col gap-3">
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

          <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Create template"}</Button>
        </form>
      </Card>

      <Card title={`Templates (${templates.length})`}>
        <ul className="flex flex-col divide-y divide-black/5">
          {templates.map((t) => (
            <li key={t._id} className="py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t.name}</p>
                <div className="flex items-center gap-2">
                  <Badge tone={t.active ? "success" : "default"}>{t.active ? "active" : "inactive"}</Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await fetch(`/api/case-type-templates/${t._id}`, {
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
              <p className="text-xs text-ink/50 mt-1">
                {t.leChecklist?.length || 0} LE fields · {t.riskFactorChecklist?.length || 0} risk factors ·{" "}
                {t.labPanelPreset?.length || 0} lab presets
              </p>
              {t.dietInstruction && <p className="text-xs text-ink/50 mt-0.5">Diet: {t.dietInstruction}</p>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
