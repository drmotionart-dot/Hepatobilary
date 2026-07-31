import Link from "next/link";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import NewCaseForm from "@/components/clinic/NewCaseForm";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireSession } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Encounter, Patient } from "@/lib/models/types";

export default async function ClinicPage() {
  const session = await requireSession();
  const db = await getDb();

  const followUps = await db.collection<Encounter>("encounters")
    .find({ status: "follow-up-pending" })
    .sort({ openedAt: -1 })
    .limit(20)
    .toArray();

  const patientIds = [...new Set(followUps.map((e) => e.patientId.toString()))];
  const patients = patientIds.length
    ? await db.collection<Patient>("patients").find({ _id: { $in: patientIds.map((id) => new ObjectId(id)) } }).toArray()
    : [];
  const patientMap = new Map(patients.map((p) => [p._id!.toString(), p]));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader title="Clinic" subtitle="New cases and follow-up queue" />

        <div className="flex flex-col gap-5">
          <NewCaseForm />

          <Card title={`Follow-up queue (${followUps.length})`}>
            {followUps.length === 0 ? (
              <p className="text-sm text-ink/50">No follow-ups pending.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-black/5">
                {followUps.map((e) => {
                  const p = patientMap.get(e.patientId.toString());
                  return (
                    <li key={e._id!.toString()} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{p?.fullName || "Unknown"}</p>
                        <p className="text-xs text-ink/50">{p?.medicalNumber} · seen {formatDate(e.openedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{e.caseType}</Badge>
                        <Link href={`/clinic/${e._id}`} className="text-xs text-primary font-medium">
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
