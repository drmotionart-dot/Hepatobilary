import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import UsersManager from "@/components/admin/UsersManager";
import { getDb } from "@/lib/mongodb";
import { requireRole } from "@/lib/api";
import { redirect } from "next/navigation";
import type { User } from "@/lib/models/types";

export default async function AdminUsersPage() {
  const session = await requireRole(["admin"]);
  if (!session) redirect("/dashboard");

  const db = await getDb();
  const users = await db
    .collection<User>("users")
    .find({})
    .project({ passwordHash: 0 })
    .sort({ createdAt: -1 })
    .toArray();

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader title="Users & approvals" subtitle="Rotation imports, pending self-registrations, account lifecycle" />
        <UsersManager users={JSON.parse(JSON.stringify(users))} pending={JSON.parse(JSON.stringify(users.filter((u) => u.status === "pending-approval")))} />
      </div>
    </AppShell>
  );
}
