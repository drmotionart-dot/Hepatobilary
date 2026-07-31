import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import FormManager from "@/components/admin/FormManager";
import { getDb } from "@/lib/mongodb";
import { requireRole } from "@/lib/api";
import { redirect } from "next/navigation";
import type { FormTemplate } from "@/lib/models/types";

export default async function AdminFormsPage() {
  const session = await requireRole(["admin"]);
  if (!session) redirect("/dashboard");

  const db = await getDb();
  const templates = await db.collection<FormTemplate>("formTemplates").find().sort({ name: 1 }).toArray();

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader title="Form templates" subtitle="Custom departmental forms (specialty consults, post-op, etc.)" />
        <FormManager templates={JSON.parse(JSON.stringify(templates))} />
      </div>
    </AppShell>
  );
}
