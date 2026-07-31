"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";

export default function UsersManager({ users, pending }: { users: any[]; pending: any[] }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState<any>(null);

  async function act(userId: string, action: string) {
    setError("");
    const res = await fetch(`/api/admin/users/${userId}`, {
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

  async function importRotation(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setMessage("");
    setImportResult(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/users", { method: "POST", body: formData });
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
      {/* Rotation import */}
      <Card title="Import rotation (Excel)">
        <form onSubmit={importRotation} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-40">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <p className="text-xs text-ink/50 mt-1">
              Columns: name, email, number. Creates intern accounts, 50-day expiry, forced password change.
            </p>
          </div>
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
              <p key={i} className="text-ink/70 font-mono">{r.name} — {r.email} — pw: {r.generatedPassword}</p>
            ))}
          </div>
        )}
      </Card>

      {/* Pending approvals */}
      {pending.length > 0 && (
        <Card title={`Pending approvals (${pending.length})`}>
          <ul className="flex flex-col divide-y divide-black/5">
            {pending.map((u) => (
              <li key={u._id} className="py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{u.fullName}</p>
                  <p className="text-xs text-ink/50">{u.email} · {u.role} · requested {formatDate(u.createdAt)}</p>
                </div>
                <Button size="sm" onClick={() => act(u._id, "approve")}>Approve</Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* All users */}
      <Card title={`All users (${users.length})`}>
        {users.length === 0 ? (
          <p className="text-sm text-ink/50">No users yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5">
            {users.map((u) => (
              <li key={u._id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{u.fullName}</p>
                  <p className="text-xs text-ink/50 truncate">
                    {u.email} · {u.role} · {u.accountType}
                    {u.expiresAt ? ` · expires ${formatDate(u.expiresAt)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge tone={statusTone(u.status) as any}>{u.status}</Badge>
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
    </div>
  );
}
