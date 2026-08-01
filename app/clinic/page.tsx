import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import NewCaseForm from "@/components/clinic/NewCaseForm";
import { requireSession, apiFetchServer } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { caseTypeDisplay } from "@/lib/constants";
import type { Encounter, Patient } from "@/lib/models/types";

type ClinicEncounter = Encounter & { patient: Patient | null };

export default async function ClinicPage() {
  const session = await requireSession();
  if (!session) redirect("/login");

  const followUps = (await apiFetchServer<ClinicEncounter[]>("/api/encounters?type=clinic&status=follow-up-pending")) || [];
  const activeCases = (await apiFetchServer<ClinicEncounter[]>("/api/encounters?type=clinic&status=active")) || [];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader title="Clinic" subtitle="New cases and follow-up queue" />

        <div className="flex flex-col gap-5">
          {session.role !== "admin" && <NewCaseForm />}

          <Card title={`Active cases (${activeCases.length})`}>
            {activeCases.length === 0 ? (
              <p className="text-sm text-muted">No active clinic cases.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {activeCases.map((e) => {
                  const p = e.patient;
                  return (
                    <li key={e._id!.toString()} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" dir="auto">{p?.fullName || "Unknown"}</p>
                        <p className="text-xs text-muted">{p?.medicalNumber} · seen {formatDate(e.openedAt)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="max-w-[45vw] truncate">{caseTypeDisplay(e.caseType, e.customCaseTypeLabel)}</Badge>
                        <Link href={`/ward/${e._id}`} className="text-xs text-primary font-medium whitespace-nowrap">
                          Open →
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title={`Follow-up queue (${followUps.length})`}>
            {followUps.length === 0 ? (
              <p className="text-sm text-muted">No follow-ups pending.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {followUps.map((e) => {
                  const p = e.patient;
                  return (
                    <li key={e._id!.toString()} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" dir="auto">{p?.fullName || "Unknown"}</p>
                        <p className="text-xs text-muted">{p?.medicalNumber} · seen {formatDate(e.openedAt)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="max-w-[45vw] truncate">{caseTypeDisplay(e.caseType, e.customCaseTypeLabel)}</Badge>
                        <Link href={`/clinic/${e._id}`} className="text-xs text-primary font-medium whitespace-nowrap">
                          Open →
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
