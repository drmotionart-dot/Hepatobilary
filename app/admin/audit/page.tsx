import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { requireRole, apiFetchServer } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { AuditLog } from "@/lib/models/types";

type AuditLogWithName = AuditLog & { performedByName: string };

export default async function AdminAuditPage() {
  const session = await requireRole(["resident", "admin"]);
  if (!session) redirect("/dashboard");

  const logs = (await apiFetchServer<AuditLogWithName[]>("/api/audit-log?limit=200")) || [];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <PageHeader title="Audit log" subtitle="Last 200 write operations across the system" />

        <Card>
          {logs.length === 0 ? (
            <p className="text-sm text-ink/50">No audit entries yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink/50 border-b border-black/10">
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">Collection</th>
                    <th className="py-2 pr-3">Action</th>
                    <th className="py-2">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l._id!.toString()} className="border-b border-black/5">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-ink/60">{formatDateTime(l.performedAt)}</td>
                      <td className="py-2 pr-3">{l.performedByName || "Unknown"}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{l.collection}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs font-medium ${l.action === "create" ? "text-success" : l.action === "delete" ? "text-danger" : "text-warning"}`}>
                          {l.action}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-ink/70">{l.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
