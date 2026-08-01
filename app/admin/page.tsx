import Link from "next/link";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/api";

// Role-aware Admin hub (spec §7): residents get the shared management tools
// (users/approvals, audit log, lab review queue); admins get the full set
// including templates, form definitions and lab mappings.

const ALL_LINKS = [
  { href: "/admin/users", title: "Users & approvals", desc: "Approve self-registrations, create accounts, manage capabilities & lifecycle" },
  { href: "/admin/templates", title: "Case type templates", desc: "LE checklists, risk factors, lab presets, diet instructions" },
  { href: "/admin/forms", title: "Form templates", desc: "Custom departmental form definitions" },
  { href: "/lab-import/mappings", title: "Lab test mappings", desc: "PDF test names → internal lab panel keys" },
  { href: "/admin/audit", title: "Audit log", desc: "Every write across the system, who and when" },
  { href: "/admin/lab-review", title: "Lab review queue", desc: "Imports waiting for a patient match" },
];

export default async function AdminPage() {
  const session = await requireRole(["admin", "resident"]);
  if (!session) redirect("/dashboard");

  const isAdmin = session.role === "admin";
  const links = isAdmin ? ALL_LINKS : ALL_LINKS.filter((l) => ["/admin/users", "/admin/audit", "/admin/lab-review"].includes(l.href));

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader title="Admin" subtitle="Department administration" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              <Card className="hover:border-primary/40 transition-colors h-full">
                <h3 className="text-sm font-semibold text-primary">{l.title}</h3>
                <p className="text-xs text-muted mt-1">{l.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
