import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import LabImportUploader from "@/components/lab-import/LabImportUploader";
import { requireSession, apiFetchServer } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { LabImport, Patient } from "@/lib/models/types";

type LabImportWithPatient = LabImport & { matchedPatient: Patient | null };

export default async function LabImportPage() {
  const session = await requireSession();
  if (!session) redirect("/login");

  const canReview = session.role === "resident" || session.role === "admin";

  const imports = (await apiFetchServer<LabImportWithPatient[]>("/api/lab-import")) || [];
  const recent = imports.slice(0, 20);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader
          title="Lab imports"
          subtitle="Upload pathology PDFs — patient code auto-matches to records"
          action={
            canReview ? (
              <Link href="/admin/lab-review" className="text-sm text-primary font-medium">
                Review queue →
              </Link>
            ) : undefined
          }
        />

        <div className="flex flex-col gap-5">
          <LabImportUploader />

          <Card title="Recent imports">
            {recent.length === 0 ? (
              <EmptyState title="No imports yet." className="py-6" />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {recent.map((i) => {
                  const p = i.matchedPatient;
                  return (
                    <li key={i._id!.toString()} className="py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{i.sourceFileName}</p>
                        <Badge tone={i.status === "matched" ? "success" : "warning"}>{i.status}</Badge>
                      </div>
                      <p className="text-xs text-muted mt-0.5">
                        {i.patientCode} · <span dir="auto">{p ? p.fullName : "unmatched"}</span> · {i.extractedTests.length} tests · {formatDateTime(i.importedAt)}
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
