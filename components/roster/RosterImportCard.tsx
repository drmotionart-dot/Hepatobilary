"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { apiFetch } from "@/lib/client-api";
import { formatDate } from "@/lib/format";

type UnmatchedRow = {
  rowIndex: number;
  date: string;
  target: string;
  name: string;
  phone?: string;
};

type ReviewImport = {
  _id: string;
  sourceFileName: string;
  uploadedAt: string;
  rows: UnmatchedRow[];
};

type ReviewUser = { _id: string; fullName: string; role: string; phone?: string };

function targetLabel(target: string): string {
  if (target.startsWith("pool:")) return `Emergency pool (${target.slice(5)})`;
  return "Shift slot";
}

export default function RosterImportCard() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [review, setReview] = useState<{ users: ReviewUser[]; imports: ReviewImport[] } | null>(null);
  const [createResult, setCreateResult] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  async function loadReview() {
    const res = await apiFetch("/api/roster/import/review");
    if (res.ok) setReview(await res.json());
  }

  useEffect(() => {
    loadReview();
  }, []);

  async function importRoster(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setMessage("");
    setResult(null);
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiFetch("/api/roster/import", { method: "POST", body: formData });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error || "Import failed");
      return;
    }
    setResult(await res.json());
    setMessage("Import finished. Unmatched entries are queued below for review.");
    setFile(null);
    loadReview();
    router.refresh();
  }

  async function exportRoster() {
    setError("");
    const params = new URLSearchParams();
    if (exportFrom) params.set("from", exportFrom);
    if (exportTo) params.set("to", exportTo);
    const res = await apiFetch(`/api/roster/export${params.size ? `?${params.toString()}` : ""}`);
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error || "Export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "roster-export.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function resolveRow(importId: string, rowIndex: number, userId?: string, ignore = false) {
    setError("");
    const res = await apiFetch("/api/roster/import/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importId, rowIndex, userId, ignore }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error || "Update failed");
      return;
    }
    loadReview();
    router.refresh();
  }

  async function createAccount(importId: string, rowIndex: number) {
    setError("");
    setCreateResult(null);
    const res = await apiFetch("/api/roster/import/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importId, action: "create-account", rowIndex }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok) {
      setError(d?.error || "Could not create account");
      return;
    }
    setCreateResult({ kind: "one", ...d });
    loadReview();
    router.refresh();
  }

  async function createAllAccounts() {
    setError("");
    setCreateResult(null);
    setCreating(true);
    try {
      const res = await apiFetch("/api/roster/import/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-all" }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok) {
        setError(d?.error || "Could not create accounts");
        return;
      }
      setCreateResult({ kind: "all", ...d });
      loadReview();
      router.refresh();
    } finally {
      setCreating(false);
    }
  }

  const s = result?.summary;

  return (
    <div className="flex flex-col gap-5">
      <Card title="Rotation roster import / export (Wardyati)">
        <form onSubmit={importRoster} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-40">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <p className="text-xs text-ink/50 mt-1">
              One row per day, one column per shift slot; cells hold bulleted &quot;name + phone&quot; pairs.
              People match by phone, then by name. Emergency days fill the duty pool.
            </p>
          </div>
          <Button type="submit" disabled={loading || !file} size="sm">
            {loading ? "Importing…" : "Import"}
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div>
            <Label>Export from</Label>
            <Input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} />
          </div>
          <div>
            <Label>Export to</Label>
            <Input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} />
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={exportRoster}>
            Export roster (Excel)
          </Button>
        </div>

        {error && <p className="text-xs text-danger mt-2">{error}</p>}
        {message && <p className="text-xs text-success mt-2">{message}</p>}

        {result && s && (
          <div className="mt-3 rounded-lg bg-primary/5 p-3 text-xs flex flex-col gap-1">
            <p className="font-medium">Import summary — {result.sourceFileName}</p>
            <p className="text-ink/70">
              {s.days} days · {s.peopleMatched}/{s.peopleFound} people matched · {s.peopleUnmatched} unmatched
            </p>
            <p className="text-ink/70">
              {s.assignmentsCreated} assignments created · {s.assignmentsUpdated} updated · {s.poolsCreated} emergency pools
            </p>
            {result.unrecognizedColumns?.length > 0 && (
              <p className="text-warning">Unrecognized columns: {result.unrecognizedColumns.join(", ")}</p>
            )}
          </div>
        )}
      </Card>

      {review && review.imports.length > 0 && (
        <Card title={`Unmatched roster entries (${review.imports.reduce((n, i) => n + i.rows.length, 0)})`}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-ink/50">
                People with a phone can get an account created right here (matches by phone, never duplicates).
              </p>
              <Button type="button" size="sm" loading={creating} onClick={createAllAccounts}>
                Create accounts for all
              </Button>
            </div>

            {createResult && (
              <div className="rounded-lg bg-primary/5 p-3 text-xs">
                {createResult.kind === "all" ? (
                  <>
                    <p className="font-medium mb-1">
                      {createResult.created.length} created · {createResult.matchedExisting} matched existing · {createResult.skipped.length} skipped · {createResult.remaining} still unmatched
                    </p>
                    {createResult.created.map((c: any, i: number) => (
                      <p key={i} className="text-ink/70 font-mono">{c.name} — login: {c.loginId} — pw: {c.password}</p>
                    ))}
                    {createResult.skipped.map((c: any, i: number) => (
                      <p key={`s${i}`} className="text-ink/50">Skipped: {c.name} — {c.reason}</p>
                    ))}
                  </>
                ) : (
                  createResult.account && (
                    <>
                      <p className="font-medium mb-1">Account created and assigned</p>
                      <p className="text-ink/70 font-mono">{createResult.account.name} — login: {createResult.account.loginId} — pw: {createResult.account.password}</p>
                    </>
                  )
                )}
              </div>
            )}

            {review.imports.map((imp) => (
              <div key={imp._id}>
                <p className="text-xs text-ink/50 mb-2">
                  {imp.sourceFileName} — imported {formatDate(imp.uploadedAt)}
                </p>
                <ul className="flex flex-col divide-y divide-border">
                  {imp.rows.map((row, i) => (
                    <li key={i} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium" dir="auto">{row.name}</p>
                        <p className="text-xs text-ink/50">
                          {formatDate(row.date)} · {targetLabel(row.target)}{row.phone ? ` · ${row.phone}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) resolveRow(imp._id, row.rowIndex, e.target.value);
                          }}
                        >
                          <option value="">Match to…</option>
                          {review.users.map((u) => (
                            <option key={u._id} value={u._id}>{u.fullName} ({u.role})</option>
                          ))}
                        </select>
                        <Button type="button" variant="secondary" size="sm" onClick={() => resolveRow(imp._id, row.rowIndex, undefined, true)}>
                          Ignore
                        </Button>
                        {row.phone && (
                          <Button type="button" size="sm" onClick={() => createAccount(imp._id, row.rowIndex)}>
                            Create account
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      {review && review.imports.length === 0 && (
        <p className="text-xs text-ink/50">No unmatched roster entries waiting for review.</p>
      )}
    </div>
  );
}
