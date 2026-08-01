import Link from "next/link";
import { requireSession } from "@/lib/api";
import TopBar from "@/components/TopBar";
import MobileNav from "@/components/MobileNav";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ward", label: "Ward" },
  { href: "/clinic", label: "Clinic" },
  { href: "/emergency", label: "Emergency" },
  { href: "/lab-import", label: "Lab import" },
];

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const role = session?.role;
  const isAdmin = role === "admin";
  const isResidentOrAbove = role === "admin" || role === "resident";

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
          <div className="mb-8 px-2 text-lg font-semibold text-primary">HPB Department</div>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/roster"
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors"
            >
              Roster
            </Link>

            {(isResidentOrAbove) && (
              <>
                <Link
                  href="/lab-import/needs-review"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-ink/60 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  Lab review queue
                </Link>
                <Link
                  href="/admin/audit"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-ink/60 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  Audit log
                </Link>
              </>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className="mt-4 rounded-lg px-3 py-2 text-sm font-medium text-ink/60 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                Admin
              </Link>
            )}
          </nav>
        </aside>

        <main className="flex-1 pb-16 md:pb-0">{children}</main>

        {/* Mobile bottom tab bar */}
        <MobileNav items={NAV} extra={[{ href: "/roster", label: "Roster" }]} className="print:hidden" />
      </div>
    </div>
  );
}
