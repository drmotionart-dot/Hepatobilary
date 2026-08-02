import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import ResolveReportButton from "@/components/admin/ResolveReportButton";
import { requireRole, apiFetchServer } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ProblemReport } from "@/lib/models/types";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  resident: "Resident",
  intern: "Intern",
};

export default async function AdminProblemsPage({ searchParams }: { searchParams: Record<string, string> }) {
  const session = await requireRole(["resident", "admin"]);
  if (!session) redirect("/dashboard");

  const { status } = searchParams;
  const params = new URLSearchParams({ limit: "200" });
  if (status === "open" || status === "resolved") params.set("status", status);

  const reports = (await apiFetchServer<ProblemReport[]>(`/api/problem-reports?${params.toString()}`)) || [];
  const openCount = reports.filter((r) => r.status === "open").length;

  const tabs = [
    { key: "", label: `All (${reports.length})` },
    { key: "open", label: `Open (${openCount})` },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <PageHeader title="Problem reports" subtitle="Issues filed by staff from the top-bar button" />

        <div className="mb-3 flex gap-2">
          {tabs.map((t) => {
            const active = status === t.key;
            return (
              <Link
                key={t.key || "all"}
                href={t.key ? `/admin/problems?status=${t.key}` : "/admin/problems"}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-muted hover:bg-ink/5"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        <Card className="p-0 overflow-hidden">
          {reports.length === 0 ? (
            <EmptyState title="No reports to show." className="py-6" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted border-b border-border">
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">Who</th>
                    <th className="py-2 pr-3">Page</th>
                    <th className="py-2 pr-3">Description</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r._id!.toString()} className="border-b border-border">
                      <td className="py-2 pr-3 whitespace-nowrap text-xs text-muted">{formatDateTime(r.createdAt)}</td>
                      <td className="py-2 pr-3" dir="auto">
                        <span className="font-medium">{r.performedByName || "Unknown"}</span>
                        <span className="block text-xs text-muted">{ROLE_LABELS[r.role] || r.role}</span>
                      </td>
                      <td className="py-2 pr-3 max-w-[180px]">
                        {r.url ? (
                          <span className="break-all text-xs text-muted" dir="ltr">{r.url}</span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-ink/80 whitespace-pre-wrap" dir="auto">{r.description}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={r.status === "resolved" ? "success" : "warning"}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2 whitespace-nowrap">
                        <ResolveReportButton id={r._id!.toString()} resolved={r.status === "resolved"} />
                      </td>
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
