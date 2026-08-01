"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { apiFetch } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";

// Generic form filling (spec 3.12): any admin-defined template can be filled
// against an encounter, and the filled instance is stored as a FormRecord.
type FormField = { fieldKey: string; label: string; type: string; options?: string[] };
type Template = { _id: string; name: string; fields: FormField[] };
type RecordItem = { _id: string; templateId: string; values: Record<string, unknown>; createdBy?: string; authorName?: string; createdAt: string };

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
}) {
  const type = field.type || "text";
  if (type === "textarea") {
    return (
      <textarea
        rows={3}
        dir="auto"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  if (type === "select") {
    return (
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {(field.options || []).map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </Select>
    );
  }
  if (type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={value === "true"} onChange={(e) => onChange(e.target.checked ? "true" : "")} />
        <span className="text-muted">{value === "true" ? "Yes" : "No"}</span>
      </label>
    );
  }
  return <Input dir="auto" value={value} onChange={(e) => onChange(e.target.value)} />;
}

export default function FormRecords({ encounterId, canFill = true }: { encounterId: string; canFill?: boolean }) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const [tRes, rRes] = await Promise.all([
        apiFetch("/api/form-templates"),
        apiFetch(`/api/form-records?encounterId=${encounterId}`),
      ]);
      if (tRes.ok) setTemplates(await tRes.json());
      if (rRes.ok) {
        const list = await rRes.json();
        // authorName is injected by GET /api/form-records server-side
        setRecords(list);
      }
    })();
  }, [encounterId]);

  const selectedTemplate = useMemo(() => templates.find((t) => t._id === selected), [templates, selected]);

  function pickTemplate(id: string) {
    setSelected(id);
    setValues({});
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTemplate) return;
    setError("");
    setLoading(true);
    const cleaned: Record<string, unknown> = {};
    for (const f of selectedTemplate.fields) {
      const v = values[f.fieldKey] ?? "";
      if (f.type === "boolean") cleaned[f.fieldKey] = v === "true";
      else if (v.trim()) cleaned[f.fieldKey] = v.trim();
      else cleaned[f.fieldKey] = "";
    }
    const res = await apiFetch("/api/form-records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ encounterId, templateId: selectedTemplate._id, values: cleaned }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error || "Could not save form");
      return;
    }
    setValues({});
    setSelected("");
    const rRes = await apiFetch(`/api/form-records?encounterId=${encounterId}`);
    if (rRes.ok) setRecords(await rRes.json());
    router.refresh();
  }

  const templateNames = useMemo(() => new Map(templates.map((t) => [t._id, t.name])), [templates]);

  return (
    <div className="flex flex-col gap-3">
      {records.length === 0 && !selectedTemplate ? (
        <EmptyState title="No generic forms filled yet." className="py-5 mb-1" />
      ) : (
        records.length > 0 && (
          <ul className="flex flex-col divide-y divide-border mb-1">
            {records.map((r) => (
              <li key={r._id} className="py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{templateNames.get(r.templateId) || "Form"}</p>
                  <span className="text-xs text-muted">
                    {r.authorName || "Unknown"} · {formatDateTime(r.createdAt)}
                  </span>
                </div>
                {Object.entries(r.values || {}).filter(([, v]) => v !== "" && v !== false).map(([k, v]) => (
                  <p key={k} className="text-xs text-ink/70 mt-0.5">
                    <span className="text-muted capitalize">{k.replace(/_/g, " ")}:</span> {String(v)}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        )
      )}

      {canFill && (!selectedTemplate ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selected} onChange={(e) => pickTemplate(e.target.value)} className="flex-1 min-w-40">
            <option value="">Fill a generic form…</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>{t.name}</option>
            ))}
          </Select>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{selectedTemplate.name}</p>
            <button type="button" className="text-xs text-muted hover:text-ink" onClick={() => setSelected("")}>
              Cancel
            </button>
          </div>
          {selectedTemplate.fields.map((f) => (
            <div key={f.fieldKey}>
              <Label>{f.label}</Label>
              <FieldInput field={f} value={values[f.fieldKey] ?? ""} onChange={(v) => setValues((prev) => ({ ...prev, [f.fieldKey]: v }))} />
            </div>
          ))}
          {error && <p className="text-xs text-danger">{error}</p>}
          <div>
            <Button type="submit" size="sm" loading={loading}>{loading ? "Saving…" : "Save form"}</Button>
          </div>
        </form>
      ))}
    </div>
  );
}
