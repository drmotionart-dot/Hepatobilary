import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import TemplateManager from "@/components/admin/TemplateManager";
import { getDb } from "@/lib/mongodb";
import { requireRole } from "@/lib/api";
import { redirect } from "next/navigation";
import type { CaseTypeTemplate } from "@/lib/models/types";

export default async function AdminTemplatesPage() {
  const session = await requireRole(["admin"]);
  if (!session) redirect("/dashboard");

  const db = await getDb();
  const templates = await db.collection<CaseTypeTemplate>("caseTypeTemplates").find().sort({ name: 1 }).toArray();

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader title="Case type templates" subtitle="LE checklists, risk factors, lab presets and diet instructions per case type" />
        <TemplateManager templates={JSON.parse(JSON.stringify(templates))} />
      </div>
    </AppShell>
  );
}
