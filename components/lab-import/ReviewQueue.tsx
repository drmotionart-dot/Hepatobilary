"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { formatDateTime } from "@/lib/format";
import { apiFetch } from "@/lib/client-api";

export default function ReviewQueue({ imports }: { imports: any[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [medicalNumber, setMedicalNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function resolve(importId: string) {
    setError("");
    setLoading(true);
    const res = await apiFetch("/api/lab-import/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importId, medicalNumber, fullName }),
    });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not resolve import");
      return;
    }
    setExpanded(null);
    setMedicalNumber("");
    setFullName("");
    router.refresh();
  }

  async function remove(importId: string) {
    if (!window.confirm("Delete this import? This removes the extracted lab data and clears it from the review queue.")) return;
    setError("");
    setRemovingId(importId);
    const res = await apiFetch(`/api/lab-import/${importId}`, { method: "DELETE" });
    setRemovingId(null);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not remove import");
      return;
    }
    router.refresh();
  }

  if (imports.length === 0) {
    return <Card><p className="text-sm text-ink/50">No imports awaiting review.</p></Card>;
  }

  return (
    <div className="flex flex-col gap-3">
      {imports.map((i) => (
        <Card key={i._id}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{i.sourceFileName}</p>
              <p className="text-xs text-ink/50 mt-0.5">
                Patient code <span className="font-semibold">{i.patientCode}</span> · {formatDateTime(i.importedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="danger"
                disabled={removingId === i._id}
                onClick={() => remove(i._id)}
              >
                {removingId === i._id ? "Removing…" : "Remove"}
              </Button>
              <Button size="sm" variant={expanded === i._id ? "ghost" : "secondary"} onClick={() => setExpanded(expanded === i._id ? null : i._id)}>
                {expanded === i._id ? "Close" : "Resolve"}
              </Button>
            </div>
          </div>

          {i.extractedTests?.length > 0 && (
            <p className="text-xs text-ink/50 mt-2">
              {i.extractedTests.slice(0, 6).map((t: any) => t.externalTestName).join(", ")}
              {i.extractedTests.length > 6 ? ` +${i.extractedTests.length - 6} more` : ""}
            </p>
          )}

          {expanded === i._id && (
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
              <p className="text-xs text-ink/60">
                Link this import to an existing patient by medical number, or create a new patient record.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Medical number (from hospital records)</Label>
                  <Input value={medicalNumber} onChange={(e) => setMedicalNumber(e.target.value)} placeholder="e.g. 2023-001234" />
                </div>
                <div>
                  <Label>Full name (only if creating a new patient)</Label>
                  <Input dir="auto" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <div>
                <Button size="sm" disabled={loading || !medicalNumber.trim()} loading={loading} onClick={() => resolve(i._id)}>
                  {loading ? "Linking…" : "Link patient & mark matched"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
