"use client";

// Desktop sidebar links with MobileNav-style active-state highlighting
// (exact match + `${href}/` prefix). All links render at full opacity; the
// active one is tinted with the primary color.

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

export default function SidebarNav({ items, className = "" }: { items: NavItem[]; className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={`flex flex-col gap-1 ${className}`}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary ${
              active ? "bg-primary/10 text-primary font-semibold" : ""
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
