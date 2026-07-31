import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import FormManager from "@/components/admin/FormManager";
import { requireRole, apiFetchServer } from "@/lib/api";
import type { FormTemplate } from "@/lib/models/types";

export default async function AdminFormsPage() {
  const session = await requireRole(["admin"]);
  if (!session) redirect("/dashboard");

  const templates = (await apiFetchServer<FormTemplate[]>("/api/form-templates")) || [];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader title="Form templates" subtitle="Custom departmental forms (specialty consults, post-op, etc.)" />
        <FormManager templates={templates} />
      </div>
    </AppShell>
  );
}
