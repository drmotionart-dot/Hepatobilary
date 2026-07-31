import Link from "next/link";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LabImportUploader from "@/components/lab-import/LabImportUploader";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireSession } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { LabImport, Patient } from "@/lib/models/types";

export default async function LabImportPage() {
  const session = await requireSession();
  const db = await getDb();

  const imports = await db.collection<LabImport>("labImports").find().sort({ importedAt: -1 }).limit(20).toArray();

  const patientIds = imports.filter((i) => i.matchedPatientId).map((i) => i.matchedPatientId!.toString());
  const patients = patientIds.length
    ? await db.collection<Patient>("patients").find({ _id: { $in: [...new Set(patientIds)].map((id) => new ObjectId(id)) } }).toArray()
    : [];
  const patientMap = new Map(patients.map((p) => [p._id!.toString(), p]));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader
          title="Lab imports"
          subtitle="Upload pathology PDFs — patient code auto-matches to records"
          action={
            <Link href="/lab-import/needs-review" className="text-sm text-primary font-medium">
              Review queue →
            </Link>
          }
        />

        <div className="flex flex-col gap-5">
          <LabImportUploader />

          <Card title="Recent imports">
            {imports.length === 0 ? (
              <p className="text-sm text-ink/50">No imports yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-black/5">
                {imports.map((i) => {
                  const p = i.matchedPatientId ? patientMap.get(i.matchedPatientId.toString()) : null;
                  return (
                    <li key={i._id!.toString()} className="py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{i.sourceFileName}</p>
                        <Badge tone={i.status === "matched" ? "success" : "warning"}>{i.status}</Badge>
                      </div>
                      <p className="text-xs text-ink/50 mt-0.5">
                        {i.patientCode} · {p ? p.fullName : "unmatched"} · {i.extractedTests.length} tests · {formatDateTime(i.importedAt)}
                      </p>
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
