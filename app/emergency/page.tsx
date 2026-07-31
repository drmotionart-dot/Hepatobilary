import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import EmergencyAssessmentForm from "@/components/emergency/EmergencyAssessmentForm";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireSession } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Encounter, Patient, ClinicalNote } from "@/lib/models/types";

export default async function EmergencyPage() {
  const session = await requireSession();
  const db = await getDb();

  // Recent emergency cases seen today / in the last 24h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const encounters = await db.collection<Encounter>("encounters")
    .find({ type: "emergency", openedAt: { $gte: since } })
    .sort({ openedAt: -1 })
    .limit(20)
    .toArray();

  const patientIds = [...new Set(encounters.map((e) => e.patientId.toString()))];
  const patients = patientIds.length
    ? await db.collection<Patient>("patients").find({ _id: { $in: patientIds.map((id) => new ObjectId(id)) } }).toArray()
    : [];
  const patientMap = new Map(patients.map((p) => [p._id!.toString(), p]));

  const encounterIds = encounters.map((e) => e._id!.toString());
  const notes = encounterIds.length
    ? await db.collection<ClinicalNote>("clinicalNotes").find({ encounterId: { $in: encounterIds.map((id) => new ObjectId(id)) }, context: "emergency-assessment" }).toArray()
    : [];
  const notesByEncounter = new Map<string, string>();
  for (const n of notes) {
    if (!notesByEncounter.has(n.encounterId.toString())) {
      notesByEncounter.set(n.encounterId.toString(), n.complaint?.main || n.presentingLine || "");
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader title="Emergency" subtitle="New assessments and last 24h" />

        <div className="flex flex-col gap-5">
          <EmergencyAssessmentForm />

          <Card title={`Last 24h (${encounters.length})`}>
            {encounters.length === 0 ? (
              <p className="text-sm text-ink/50">No emergency cases in the last 24 hours.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-black/5">
                {encounters.map((e) => {
                  const p = patientMap.get(e.patientId.toString());
                  return (
                    <li key={e._id!.toString()} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p?.fullName || "Unknown"}</p>
                        <p className="text-xs text-ink/50">
                          {p?.medicalNumber} · {formatDateTime(e.openedAt)}
                          {notesByEncounter.get(e._id!.toString()) ? ` · ${notesByEncounter.get(e._id!.toString())}` : ""}
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
