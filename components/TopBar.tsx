"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, clearToken } from "@/lib/client-api";
import { APP_NAME } from "@/lib/constants";
import ShiftKeyBadge from "@/components/shift-key/ShiftKeyBadge";

type UserInfo = { name?: string; email?: string; role: string };
type PatientHit = { _id: string; medicalNumber: string; fullName: string; age: number; sex: string };
type EncounterHit = { _id: string; status: string; type: string };

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  resident: "Resident",
  intern: "Intern",
};

export default function TopBar({ user }: { user: UserInfo | null }) {
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<PatientHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const term = q.trim();
      if (term.length < 2) {
        setResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const res = await apiFetch(`/api/patients?q=${encodeURIComponent(term)}&limit=8`);
        if (res.ok) setResults(await res.json());
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("hpb-theme", next ? "dark" : "light");
    setDark(next);
  }

  async function openPatient(p: PatientHit) {
    if (navigating) return;
    setNavigating(true);
    setOpen(false);
    setQ("");
    try {
      const res = await apiFetch(`/api/encounters?patientId=${p._id}`);
      const list: EncounterHit[] = res.ok ? await res.json() : [];
      const target = list.find((e) => e.status === "active") || list[0];
      if (target) router.push(`/ward/${target._id}`);
      else router.push("/clinic");
    } finally {
      setNavigating(false);
    }
  }

  function handleSignOut() {
    clearToken();
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface print:hidden">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5">
        <Link
          href="/dashboard"
          className="text-base font-semibold text-primary md:hidden"
        >
          {APP_NAME}
        </Link>

        <div ref={boxRef} className="relative ml-auto flex-1 max-w-xs sm:max-w-sm min-w-0">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <IconSearch />
            </span>
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                if (e.key === "Enter" && results.length > 0) openPatient(results[0]);
              }}
              placeholder="Search patients…"
              className="w-full rounded-lg border border-border bg-bg px-3 py-1.5 pl-8 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {open && (q.trim().length >= 2 || searching) && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
              {searching && <p className="px-3 py-2 text-xs text-muted">Searching…</p>}
              {!searching && results.length === 0 && (
                <p className="px-3 py-2 text-xs text-muted">No patients found.</p>
              )}
              <ul>
                {results.map((p) => (
                  <li key={p._id}>
                    <button
                      type="button"
                      onClick={() => openPatient(p)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-primary/10"
                    >
                      <span className="font-medium" dir="auto">{p.fullName}</span>
                      <span className="text-xs text-muted">
                        {p.medicalNumber} · {p.age}y · {p.sex}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="hidden sm:block">
          <ShiftKeyBadge />
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
          className="inline-flex items-center justify-center rounded-lg border border-border p-2 text-ink/70 transition-colors hover:bg-primary/10 hover:text-primary"
        >
          {dark ? <IconSun /> : <IconMoon />}
        </button>

        {user && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title={user.name || "Account"}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-ink/80 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <span className="hidden sm:inline-flex flex-col items-end leading-tight">
                <span className="text-sm font-medium">{user.name || "User"}</span>
                <span className="text-xs text-muted">{ROLE_LABELS[user.role] || user.role}</span>
              </span>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary sm:hidden">
                {user.name ? user.name.trim().charAt(0).toUpperCase() : "U"}
              </span>
              <IconChevronDown className={menuOpen ? "rotate-180" : ""} />
            </button>

            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
                <div className="border-b border-border px-3 py-2 sm:hidden">
                  <p className="text-sm font-medium leading-tight">{user.name || "User"}</p>
                  <p className="text-xs text-muted">{ROLE_LABELS[user.role] || user.role}</p>
                </div>
                <Link
                  href="/change-password"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm text-ink/90 transition-colors hover:bg-primary/10 hover:text-primary"
                >
                  <IconKey />
                  Change password
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink/90 transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <IconLogout />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function IconChevronDown({ className = "" }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${className}`}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}
