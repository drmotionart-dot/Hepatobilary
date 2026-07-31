import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ward", label: "Ward" },
  { href: "/clinic", label: "Clinic" },
  { href: "/emergency", label: "Emergency" },
  { href: "/lab-import", label: "Lab import" },
];

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role as string | undefined;
  const isAdmin = role === "admin";
  const isResidentOrAbove = role === "admin" || role === "resident";

  return (
    <div className="min-h-screen flex bg-bg text-ink">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-black/5 bg-surface p-4">
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
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-10 flex justify-around border-t border-black/5 bg-surface py-2">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="flex-1 text-center text-xs font-medium py-1">
            {item.label}
          </Link>
        ))}
        <Link href="/roster" className="flex-1 text-center text-xs font-medium py-1">
          Roster
        </Link>
      </nav>
    </div>
  );
}
