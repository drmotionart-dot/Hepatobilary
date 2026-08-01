import { redirect, notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import CapabilityManager from "@/components/admin/CapabilityManager";
import AttendancePanel from "@/components/admin/AttendancePanel";
import { requireRole, apiFetchServer } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Attendance, AuditLog } from "@/lib/models/types";

type ProfileBundle = {
  user: any;
  rosterHistory: {
    date: string;
    label: string;
    dayType: string | null;
    shiftType: string | null;
    category: string | null;
    startTime?: string | null;
    endTime?: string | null;
    resolvedDayType?: string | null;
  }[];
  attendance: Attendance[];
  auditEntries: AuditLog[];
};

const STATUS_TONE: Record<string, any> = {
  active: "success",
  "pending-approval": "warning",
  expired: "danger",
  removed: "default",
};

export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const session = await requireRole(["admin", "resident"]);
  if (!session) redirect("/dashboard");

  const data = await apiFetchServer<ProfileBundle>(`/api/admin/users/${params.id}/profile`);
  if (!data) redirect("/dashboard");
  if (!data.user) notFound();

  const u = data.user;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8 flex flex-col gap-5">
        <PageHeader title={u.fullName} subtitle={u.loginId || u.email || "—"} />

        <Card title="Account">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div>
              <p className="text-xs text-muted">Role</p>
              <p className="font-medium">{u.role}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Status</p>
              <Badge tone={STATUS_TONE[u.status] || "default"}>{u.status}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted">Type</p>
              <p className="font-medium">{u.accountType}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Email</p>
              <p className="font-medium">{u.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Phone</p>
              <p className="font-medium">{u.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Expires</p>
              <p className="font-medium">{u.expiresAt ? formatDate(u.expiresAt) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Forced password change</p>
              <p className="font-medium">{u.mustChangePassword ? "Yes" : "No"}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Created</p>
              <p className="font-medium">{formatDate(u.createdAt)}</p>
            </div>
          </div>
        </Card>

        {session.role === "admin" && (
        <Card title="Capabilities" className="flex flex-col gap-2">
          <CapabilityManager userId={u._id} granted={u.grantedCapabilities || []} />
        </Card>
        )}

        <Card title="Attendance" className="flex flex-col gap-2">
          <AttendancePanel userId={u._id} records={data.attendance} />
        </Card>

        <Card title={`Roster / shift history (${data.rosterHistory.length})`}>
          {data.rosterHistory.length === 0 ? (
            <p className="text-sm text-muted">No shift assignments recorded.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.rosterHistory.map((r, i) => (
                <li key={i} className="py-2 flex items-center justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{r.label}</p>
                    <p className="text-xs text-muted">{formatDate(r.date)} · {r.resolvedDayType || r.dayType || "normal"} day</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.shiftType && <Badge tone="info">{r.shiftType}</Badge>}
                    {r.category && r.category !== "none" && <Badge>{r.category}</Badge>}
                    {r.startTime && (
                      <span className="text-xs text-muted font-mono">{r.startTime}{r.endTime ? `–${r.endTime}` : ""}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Audit trail (${data.auditEntries.length})`}>
          {data.auditEntries.length === 0 ? (
            <p className="text-sm text-muted">No audit entries for this user.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.auditEntries.map((l) => (
                <li key={l._id?.toString()} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{l.summary}</p>
                    <p className="text-xs text-muted">
                      {l.collection} · {formatDateTime(l.performedAt)}
                      {l.shiftKey ? ` · key ${l.shiftKey}${l.shiftKeyMatched === false ? " (stale on sync)" : ""}` : ""}
                    </p>
                  </div>
                  <Badge tone={l.action === "create" ? "success" : l.action === "delete" ? "danger" : "warning"}>{l.action}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
