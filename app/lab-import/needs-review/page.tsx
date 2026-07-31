import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import ReviewQueue from "@/components/lab-import/ReviewQueue";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireSession } from "@/lib/api";
import type { LabImport, Patient } from "@/lib/models/types";

export default async function NeedsReviewPage() {
  const session = await requireSession();
  const db = await getDb();

  const imports = await db.collection<LabImport>("labImports")
    .find({ status: "needs-review" })
    .sort({ importedAt: -1 })
    .limit(50)
    .toArray();

  const patientIds = imports.filter((i) => i.matchedPatientId).map((i) => i.matchedPatientId!.toString());
  const patients = patientIds.length
    ? await db.collection<Patient>("patients").find({ _id: { $in: [...new Set(patientIds)].map((id) => new ObjectId(id)) } }).toArray()
    : [];
  const patientMap = new Map(patients.map((p) => [p._id!.toString(), p]));

  const enriched = imports.map((i) => ({
    ...i,
    _id: i._id!.toString(),
    matchedPatient: i.matchedPatientId ? patientMap.get(i.matchedPatientId.toString()) || null : null,
  }));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader
          title="Review queue"
          subtitle={`${imports.length} import(s) waiting for a patient match`}
        />
        <ReviewQueue imports={JSON.parse(JSON.stringify(enriched))} />
      </div>
    </AppShell>
  );
}
