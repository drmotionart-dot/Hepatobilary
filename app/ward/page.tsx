import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { requireSession, apiFetchServer } from "@/lib/api";
import { caseTypeDisplay } from "@/lib/constants";
import type { Patient } from "@/lib/models/types";

type WardCard = {
  _id: string;
  patientId: string;
  caseType: string;
  customCaseTypeLabel?: string | null;
  status: string;
  openedAt: string;
  patient: Patient | null;
  lastNote: { presentingLine?: string } | null;
  dayOfStay: number;
  labsPending: boolean;
  imagingPending: boolean;
  readyForDischarge: boolean;
};

type WardBoard = { male: WardCard[]; female: WardCard[] };

function lastNDays(n: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    days.push(d);
  }
  return days;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-ink/60">{label}</span>
    </span>
  );
}

function PatientCard({ e, accent }: { e: WardCard; accent: "male" | "female" }) {
  const p = e.patient;
  const border = accent === "male" ? "border-l-male" : "border-l-female";
  return (
    <Link href={`/ward/${e._id.toString()}`} className="block">
      <Card className={`border-l-4 ${border} hover:border-primary/40 transition-colors`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" dir="auto">{p?.fullName || "Unknown"}</p>
            <p className="text-xs text-ink/50 mt-0.5 font-mono">{p?.medicalNumber} · {p?.age} yrs</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge tone="info">{caseTypeDisplay(e.caseType, e.customCaseTypeLabel)}</Badge>
            <span className="text-xs font-mono font-medium text-primary bg-primary/10 rounded-full px-2.5 py-0.5">
              Day {e.dayOfStay}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-2" aria-label={`Day ${e.dayOfStay} of stay`}>
          {Array.from({ length: Math.min(e.dayOfStay, 14) }).map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${i === Math.min(e.dayOfStay, 14) - 1 ? "bg-primary" : "bg-primary/30"}`}
            />
          ))}
          {e.dayOfStay > 14 && <span className="text-xs text-ink/40 ml-1 font-mono">+{e.dayOfStay - 14}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
          {e.labsPending && <StatusDot color="bg-pending" label="Labs pending" />}
          {e.imagingPending && <StatusDot color="bg-pending" label="Imaging pending" />}
          {e.readyForDischarge && <StatusDot color="bg-success" label="Ready for discharge" />}
          {!e.labsPending && !e.imagingPending && !e.readyForDischarge && (
            <span className="text-xs text-ink/40">In progress</span>
          )}
        </div>

        {e.lastNote?.presentingLine && (
          <p className="text-xs text-ink/60 mt-2 line-clamp-1" dir="auto">{e.lastNote.presentingLine}</p>
        )}
      </Card>
    </Link>
  );
}

function WardColumn({ title, color, cards, accent }: { title: string; color: string; cards: WardCard[]; accent: "male" | "female" }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/70">{title}</h2>
        <span className="text-xs text-ink/40 font-mono">{cards.length}</span>
      </div>
      <div className="flex flex-col gap-3">
        {cards.length === 0 ? (
          <EmptyState title={`No active ${title.toLowerCase()} ward patients.`} className="py-6" />
        ) : (
          cards.map((e) => <PatientCard key={e._id.toString()} e={e} accent={accent} />)
        )}
      </div>
    </section>
  );
}

export default async function WardPage() {
  const session = await requireSession();
  if (!session) redirect("/login");

  const board = await apiFetchServer<WardBoard>(`/api/ward`);
  if (!board) redirect("/login");

  const days = lastNDays(14);
  const today = new Date();

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <PageHeader
          title="Ward"
          subtitle="Day-by-day board — active inpatients by side"
          action={
            <div className="print:hidden">
              <Link href="/clinic">
                <Button size="sm">+ Open new case (clinic)</Button>
              </Link>
            </div>
          }
        />

        <div className="mb-5 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max">
            {days.map((d) => {
              const isToday = isSameDay(d, today);
              return (
                <div
                  key={d.toISOString()}
                  className={`flex flex-col items-center justify-center w-12 py-2 rounded-lg border text-center ${
                    isToday
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface text-ink/60"
                  }`}
                >
                  <span className={`text-[10px] uppercase ${isToday ? "text-white/80" : "text-ink/40"}`}>
                    {d.toLocaleDateString("en-GB", { weekday: "short" })}
                  </span>
                  <span className="text-sm font-mono font-medium">{d.getDate()}</span>
                  <span className={`text-[10px] ${isToday ? "text-white/80" : "text-ink/40"}`}>
                    {d.toLocaleDateString("en-GB", { month: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <WardColumn title="Male" color="bg-male" cards={board.male} accent="male" />
          <WardColumn title="Female" color="bg-female" cards={board.female} accent="female" />
        </div>
      </div>
    </AppShell>
  );
}
