"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

export default function MobileNav({ items, extra, className = "" }: { items: NavItem[]; extra?: NavItem[]; className?: string }) {
  const pathname = usePathname();
  const links = [...items, ...(extra || [])];

  return (
    <nav className={`fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-border bg-surface py-1.5 md:hidden ${className}`}>
      {links.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-center text-[11px] font-medium transition-colors ${
              active ? "text-primary" : "text-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
