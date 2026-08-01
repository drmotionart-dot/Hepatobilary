import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import AuditLogFilters from "@/components/admin/AuditLogFilters";
import { requireRole, apiFetchServer } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { AuditLog } from "@/lib/models/types";

type AuditLogWithName = AuditLog & { performedByName: string };

export default async function AdminAuditPage({ searchParams }: { searchParams: Record<string, string> }) {
  const session = await requireRole(["resident", "admin"]);
  if (!session) redirect("/dashboard");

  const { collection, action, user, from, to } = searchParams;
  const params = new URLSearchParams({ limit: "200" });
  if (collection) params.set("collection", collection);
  if (action) params.set("action", action);
  if (user) params.set("user", user);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const logs = (await apiFetchServer<AuditLogWithName[]>(`/api/audit-log?${params.toString()}`)) || [];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <PageHeader title="Audit log" subtitle="Write operations across the system" />

        <Card className="p-0 overflow-hidden">
          <AuditLogFilters initial={{ collection, action, user, from, to }} />

          {logs.length === 0 ? (
            <EmptyState title="No audit entries match these filters." className="py-6" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-border">
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">Collection</th>
                    <th className="py-2 pr-3">Action</th>
                    <th className="py-2 pr-3">Shift key</th>
                    <th className="py-2">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l._id!.toString()} className="border-b border-border">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted">{formatDateTime(l.performedAt)}</td>
                      <td className="py-2 pr-3" dir="auto">{l.performedByName || "Unknown"}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{l.collection}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs font-medium ${l.action === "create" ? "text-success" : l.action === "delete" ? "text-danger" : "text-warning"}`}>
                          {l.action}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {l.shiftKey ? (
                          <span className={`inline-flex items-center gap-1.5 font-mono text-xs ${l.shiftKeyMatched === false ? "text-danger" : "text-success"}`}>
                            {l.shiftKey}
                            <span className="font-sans">
                              {l.shiftKeyMatched === false ? "stale" : "ok"}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
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
