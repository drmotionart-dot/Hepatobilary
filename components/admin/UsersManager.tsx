"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { apiFetch } from "@/lib/client-api";
import CreateAccountModal from "@/components/admin/CreateAccountModal";

export default function UsersManager({
  users,
  pending,
  canImport = false,
  canCreate = false,
}: {
  users: any[];
  pending: any[];
  canImport?: boolean;
  canCreate?: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  async function act(userId: string, action: string) {
    setError("");
    const res = await apiFetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Action failed");
      return;
    }
    router.refresh();
  }

  async function downloadTemplate() {
    setError("");
    const res = await apiFetch("/api/admin/users/template");
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      setError(d?.error || "Failed to download template");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rotation-template.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importRotation(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setMessage("");
    setImportResult(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    const res = await apiFetch("/api/admin/users", { method: "POST", body: formData });
    setLoading(false);

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Import failed");
      return;
    }
    setImportResult(await res.json());
    router.refresh();
  }

  const statusTone = (s: string) => (s === "active" ? "success" : s === "pending-approval" ? "warning" : s === "expired" ? "danger" : "default");

  return (
    <div className="flex flex-col gap-5">
      {/* Rotation import (admin only) */}
      {canImport && (
      <Card title="Import rotation (Excel)">
        <form onSubmit={importRotation} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-0">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full max-w-full text-sm"
            />
            <p className="text-xs text-muted mt-1">
              Columns: name, email, number. Creates intern accounts, 50-day expiry, forced password change.
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={downloadTemplate} disabled={loading}>
            Download template
          </Button>
          <Button type="submit" disabled={loading || !file} size="sm">
            {loading ? "Importing…" : "Import"}
          </Button>
        </form>

        {error && <p className="text-xs text-danger mt-2">{error}</p>}
        {importResult && (
          <div className="mt-3 rounded-lg bg-primary/5 p-3 text-xs">
            <p className="font-medium mb-1">
              {importResult.created}/{importResult.total} users created
            </p>
            {importResult.rows.filter((r: any) => r.status === "created").map((r: any, i: number) => (
              <p key={i} className="text-ink/70 font-mono">{r.name} — login: {r.generatedLoginId} — pw: {r.generatedPassword}</p>
            ))}
            {importResult.existing > 0 && (
              <p className="text-muted">{(importResult.existing)} already had accounts (matched by phone/email) — skipped.</p>
            )}
          </div>
        )}
      </Card>
      )}

      {/* Direct account creation (admin only, spec 11.8) */}
      {canCreate && (
        <Card
          title="Create account"
          action={
            <Button size="sm" onClick={() => setCreating(true)}>
              + Create
            </Button>
          }
        >
          <p className="text-xs text-muted">
            Manually create an intern or resident account — with an initial capability grant for interns if needed.
            Bulk creation happens through the Excel rotation import above.
          </p>
        </Card>
      )}

      {/* Pending approvals */}
      {pending.length > 0 && (
        <Card title={`Pending approvals (${pending.length})`}>
          <ul className="flex flex-col divide-y divide-border">
            {pending.map((u) => (
              <li key={u._id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" dir="auto">{u.fullName}</p>
                  <p className="text-xs text-muted truncate">{u.email} · {u.role} · requested {formatDate(u.createdAt)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <Button size="sm" onClick={() => act(u._id, "approve")}>Approve</Button>
                  <Button size="sm" variant="secondary" onClick={() => act(u._id, "reject")}>Reject</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* All users */}
      <Card title={`All users (${users.length})`}>
        {users.length === 0 ? (
          <p className="text-sm text-muted">No users yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {users.map((u) => (
              <li key={u._id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <Link href={`/admin/users/${u._id}`} className="text-sm font-medium hover:text-primary" dir="auto">
                    {u.fullName}
                  </Link>
                  <p className="text-xs text-muted truncate">
                    {u.loginId || u.email} · {u.role} · {u.accountType}
                    {u.phone ? ` · ${u.phone}` : ""}
                    {u.expiresAt ? ` · expires ${formatDate(u.expiresAt)}` : ""}
                  </p>
                  {Array.isArray(u.grantedCapabilities) && u.grantedCapabilities.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {u.grantedCapabilities.map((c: string) => (
                        <Badge key={c} tone="info" className="!px-1.5 !py-0 text-[10px]">{c.replace(/-/g, " ")}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <Badge tone={statusTone(u.status) as any}>{u.status}</Badge>
                  <Link href={`/admin/users/${u._id}`}>
                    <Button size="sm" variant="secondary">View</Button>
                  </Link>
                  {u.status === "active" && (
                    <Button size="sm" variant="secondary" onClick={() => act(u._id, "remove")}>Remove</Button>
                  )}
                  {(u.status === "expired" || u.status === "removed") && (
                    <Button size="sm" variant="secondary" onClick={() => act(u._id, "reinstate")}>Reinstate</Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {creating && <CreateAccountModal onClose={() => setCreating(false)} />}
    </div>
  );
}
