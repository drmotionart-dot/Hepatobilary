import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import RosterImportCard from "@/components/roster/RosterImportCard";
import { requireRole, apiFetchServer } from "@/lib/api";
import type { User } from "@/lib/models/types";

// Round Interns directory (spec 11.8): every active intern, sorted by name,
// each row linking to the intern's profile. Resident + Admin. Also the home of
// the rotation Excel import so residents can on-board a round without touching
// account-management screens (which are admin-only).
export default async function RoundInternsPage() {
  const session = await requireRole(["admin", "resident"]);
  if (!session) redirect("/dashboard");

  const interns = await apiFetchServer<User[]>("/api/admin/interns");
  if (!interns) redirect("/dashboard");

  const canImport = session.role === "admin" || session.role === "resident";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8 flex flex-col gap-5">
        <PageHeader title="Round Interns" subtitle={`${interns.length} active intern${interns.length === 1 ? "" : "s"} on this round`} />

        {canImport && <RosterImportCard />}

        <Card title={`Interns (${interns.length})`}>
          {interns.length === 0 ? (
            <p className="text-sm text-muted">
              No active interns yet. Import the rotation roster above, or approve registrations under Users &amp; approvals.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {interns.map((u) => (
                <li key={u._id?.toString()} className="py-2.5">
                  <Link href={`/admin/users/${u._id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md hover:bg-ink/5 -mx-2 px-2 py-1 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" dir="auto">{u.fullName}</p>
                      <p className="text-xs text-muted truncate">
                        {u.loginId || u.email || "—"}
                        {u.phone ? ` · ${u.phone}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {u.accountType && u.accountType !== "self-registered" && (
                        <Badge tone="info">{u.accountType}</Badge>
                      )}
                      <span className="text-xs text-primary font-medium">Profile →</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
