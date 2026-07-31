import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import TemplateManager from "@/components/admin/TemplateManager";
import { requireRole, apiFetchServer } from "@/lib/api";
import type { CaseTypeTemplate } from "@/lib/models/types";

export default async function AdminTemplatesPage() {
  const session = await requireRole(["admin"]);
  if (!session) redirect("/dashboard");

  const templates = await apiFetchServer<CaseTypeTemplate[]>("/api/case-type-templates");
  if (!templates) redirect("/dashboard");

  const sorted = [...templates].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader title="Case type templates" subtitle="LE checklists, risk factors, lab presets and diet instructions per case type" />
        <TemplateManager templates={sorted} />
      </div>
    </AppShell>
  );
}
