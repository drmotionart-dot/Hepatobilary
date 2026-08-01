import { requireSession } from "@/lib/api";
import TopBar from "@/components/TopBar";
import MobileNav from "@/components/MobileNav";
import SidebarNav from "@/components/SidebarNav";
import { DEPARTMENT_NAME } from "@/lib/constants";

const NAV = [
  { href: "/dashboard", label: "Home" },
  { href: "/ward", label: "Ward" },
  { href: "/clinic", label: "Clinic" },
  { href: "/emergency", label: "Emergency" },
  { href: "/lab-import", label: "Labs" },
  { href: "/roster", label: "Roster" },
];

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const role = session?.role;
  const isResidentOrAbove = role === "admin" || role === "resident";
  const isAdmin = role === "admin";

  // Spec §7: the Admin hub is a resident+admin area. The hub page itself is
  // role-aware (residents see Users, Audit log and Lab review; admins see all).
  const adminItems = isResidentOrAbove ? [{ href: "/admin", label: "Admin" }] : [];
  const mobileExtra = [...(role === "intern" ? [] : adminItems)];

  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink">
      <TopBar
        user={
          session
            ? { name: session.name, email: session.email, role: session.role }
            : null
        }
      />

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-56 flex-col border-r border-border bg-surface p-4 print:hidden">
          <div className="mb-8 px-2 text-lg font-semibold text-primary">{DEPARTMENT_NAME}</div>
          <SidebarNav items={NAV} />
          {isResidentOrAbove && <SidebarNav items={adminItems} className="mt-4" />}
        </aside>

        <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>

        {/* Mobile bottom tab bar */}
        <MobileNav items={NAV} extra={mobileExtra} className="print:hidden" />
      </div>
    </div>
  );
}
