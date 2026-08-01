import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import MappingsManager from "@/components/lab-import/MappingsManager";
import { requireRole, apiFetchServer } from "@/lib/api";
import type { LabTestNameMapping } from "@/lib/models/types";

export default async function MappingsPage() {
  const session = await requireRole(["admin", "resident"]);
  if (!session) redirect("/dashboard");

  const mappings = (await apiFetchServer<LabTestNameMapping[]>("/api/lab-test-name-mappings")) || [];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader title="Lab test name mappings" subtitle="PDF external names → internal keys used in lab panels" />
        <MappingsManager mappings={mappings} />
      </div>
    </AppShell>
  );
}
