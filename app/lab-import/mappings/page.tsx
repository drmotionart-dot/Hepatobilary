import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import MappingsManager from "@/components/lab-import/MappingsManager";
import { getDb } from "@/lib/mongodb";
import { requireRole } from "@/lib/api";
import { redirect } from "next/navigation";
import type { LabTestNameMapping } from "@/lib/models/types";

export default async function MappingsPage() {
  const session = await requireRole(["admin"]);
  if (!session) redirect("/dashboard");

  const db = await getDb();
  const mappings = await db.collection<LabTestNameMapping>("labTestNameMappings").find().sort({ externalTestName: 1 }).toArray();

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader title="Lab test name mappings" subtitle="PDF external names → internal keys used in lab panels" />
        <MappingsManager mappings={JSON.parse(JSON.stringify(mappings))} />
      </div>
    </AppShell>
  );
}
