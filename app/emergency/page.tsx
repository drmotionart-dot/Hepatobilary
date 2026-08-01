import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import EmergencyAssessmentForm from "@/components/emergency/EmergencyAssessmentForm";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { requireSession, apiFetchServer } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Encounter, Patient } from "@/lib/models/types";

type EmergencyEncounter = Encounter & {
  patient: Patient | null;
  noteSummary: string;
};

export default async function EmergencyPage() {
  const session = await requireSession();
  if (!session) redirect("/login");

  const encounters = (await apiFetchServer<EmergencyEncounter[]>("/api/emergency/recent")) || [];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader title="Emergency" subtitle="New assessments and last 24h" />

        <div className="flex flex-col gap-5">
          <EmergencyAssessmentForm />

          <Card title={`Last 24h (${encounters.length})`}>
            {encounters.length === 0 ? (
              <p className="text-sm text-muted">No emergency cases in the last 24 hours.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {encounters.map((e) => {
                  const p = e.patient;
                  return (
                    <li key={e._id!.toString()} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium" dir="auto">{p?.fullName || "Unknown"}</p>
                        <p className="text-xs text-muted">
                          {p?.medicalNumber} · {formatDateTime(e.openedAt)}
                          {e.noteSummary ? ` · ${e.noteSummary}` : ""}
                        </p>
                      </div>
                      <Badge tone={e.status === "active" ? "success" : "default"}>{e.status}</Badge>
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
