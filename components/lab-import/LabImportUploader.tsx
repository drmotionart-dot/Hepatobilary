"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { apiFetch } from "@/lib/client-api";

export default function LabImportUploader() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;
    setError("");
    setResult(null);
    setLoading(true);

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    const res = await apiFetch("/api/lab-import", { method: "POST", body: formData });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Import failed");
      return;
    }
    setResult(await res.json());
    setFiles([]);
    router.refresh();
  }

  return (
    <Card title="Import lab PDFs">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files || []))}
          className="text-sm"
        />
        {files.length > 0 && (
          <p className="text-xs text-muted">{files.length} file(s) selected</p>
        )}
        {error && <p className="text-xs text-danger">{error}</p>}

        <Button type="submit" disabled={loading || files.length === 0} loading={loading}>
          {loading ? "Importing…" : `Import ${files.length || ""} PDF${files.length === 1 ? "" : "s"}`}
        </Button>
      </form>

      {result && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm">
            <span className="font-medium">Matched:</span> {result.matched} ·{" "}
            <span className="font-medium">Needs review:</span> {result.needsReview} ·{" "}
            <span className="font-medium">Errors:</span> {result.errors}
          </p>
          <ul className="flex flex-col gap-1">
            {result.results.map((r: any, i: number) => (
              <li key={i} className="text-xs text-muted">
                {r.fileName} — {r.status}{r.message ? `: ${r.message}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
