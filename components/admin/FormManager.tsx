"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import Badge from "@/components/ui/Badge";
import { apiFetch } from "@/lib/client-api";

export default function FormManager({ templates }: { templates: any[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [fields, setFields] = useState(""); // one per line: label:type
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const parsedFields = fields
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, type = "text"] = line.split(":").map((x) => x.trim());
        return { fieldKey: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"), label, type };
      });

    const res = await apiFetch("/api/form-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, fields: parsedFields, savedToSystem: true }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not create template");
      return;
    }
    setName("");
    setFields("");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <Card title="Create a form template">
        <form onSubmit={create} className="flex flex-col gap-3">
          <div>
            <Label>Template name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label>Fields (one per line, format: Label:type — type is text, textarea, or select)</Label>
            <textarea
              rows={5}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              value={fields}
              onChange={(e) => setFields(e.target.value)}
              placeholder={"Post-op vitals:text\nPain score:select\nComments:textarea"}
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Create template"}</Button>
        </form>
      </Card>

      <Card title={`Templates (${templates.length})`}>
        {templates.length === 0 ? (
          <p className="text-sm text-ink/50">No form templates yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5">
            {templates.map((t) => (
              <li key={t._id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{t.name}</p>
                  <Badge>{t.fields?.length || 0} fields</Badge>
                </div>
                <p className="text-xs text-ink/50 mt-0.5">
                  {(t.fields || []).map((f: any) => f.label).join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
