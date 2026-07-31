import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import ReviewQueue from "@/components/lab-import/ReviewQueue";
import { requireSession, apiFetchServer } from "@/lib/api";
import type { LabImport, Patient } from "@/lib/models/types";

type LabImportWithPatient = LabImport & { matchedPatient: Patient | null };

export default async function NeedsReviewPage() {
  const session = await requireSession();
  if (!session) redirect("/login");

  const imports = (await apiFetchServer<LabImportWithPatient[]>("/api/lab-import?status=needs-review")) || [];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader
          title="Review queue"
          subtitle={`${imports.length} import(s) waiting for a patient match`}
        />
        <ReviewQueue imports={imports} />
      </div>
    </AppShell>
  );
}
