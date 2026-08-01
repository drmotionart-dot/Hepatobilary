import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import UsersManager from "@/components/admin/UsersManager";
import { requireRole, apiFetchServer } from "@/lib/api";
import type { User } from "@/lib/models/types";

export default async function AdminUsersPage() {
  const session = await requireRole(["admin", "resident"]);
  if (!session) redirect("/dashboard");

  const users = await apiFetchServer<User[]>("/api/admin/users");
  if (!users) redirect("/dashboard");

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader title="Users & approvals" subtitle="Approve self-registrations, manage account lifecycle" />
        <UsersManager
          users={users}
          pending={users.filter((u) => u.status === "pending-approval")}
          canImport={session.role === "admin"}
          canCreate={session.role === "admin"}
        />
      </div>
    </AppShell>
  );
}
