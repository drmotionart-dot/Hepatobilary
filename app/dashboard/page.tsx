import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import OnShiftCard from "@/components/OnShiftCard";
import CalendarCard from "@/components/dashboard/CalendarCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import ShiftKeyCard from "@/components/shift-key/ShiftKeyCard";
import { requireSession, apiFetchServer } from "@/lib/api";
import { formatDate } from "@/lib/format";

// Today's calendar ring is computed client-side (CalendarCard), so the page
// must never be cached/prerendered with a stale "today".
export const dynamic = "force-dynamic";

type DashboardData = {
  dayType: string;
  surgeryOverlay: boolean;
  activeShift: string;
  people: { id: string; name: string; category: string }[];
  counters: { activeWard: number; followUpPending: number; needsReviewImports: number };
  followUps: {
    _id: string;
    openedAt: string;
    patient: { fullName: string; medicalNumber: string } | null;
  }[];
  serverNow: string;
  shift: { startHour: number; nightStartHour: number; activeDateKey: string; isNight: boolean };
  month: {
    days: { date: string; dayType: string; surgeryOverlay: boolean; assigned: number }[];
  };
};

export default async function DashboardPage() {
  const session = await requireSession();
  if (!session) redirect("/login");

  const data = await apiFetchServer<DashboardData>("/api/dashboard");
  if (!data) redirect("/login");

  const { dayType, activeShift, people, counters, followUps, serverNow, shift, month } = data;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8 flex flex-col gap-6">
        <OnShiftCard dayType={dayType} activeShift={activeShift} people={people} serverNow={serverNow} shift={shift} linkProfiles={session.role !== "intern"} />

        <ShiftKeyCard role={session.role} />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="!p-4">
            <p className="text-xs text-muted">Active ward patients</p>
            <p className="text-2xl font-semibold mt-1">{counters.activeWard}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs text-muted">Follow-ups pending</p>
            <p className="text-2xl font-semibold mt-1">{counters.followUpPending}</p>
          </Card>
          {session.role !== "intern" && (
          <Link href="/admin/lab-review" className="col-span-2 md:col-span-1">
            <Card className="!p-4 h-full">
              <p className="text-xs text-muted">Lab imports awaiting review</p>
              <p className="text-2xl font-semibold mt-1">
                <Badge tone={counters.needsReviewImports > 0 ? "warning" : "success"}>{counters.needsReviewImports}</Badge>
              </p>
            </Card>
          </Link>
          )}
        </div>

        <CalendarCard days={month.days} />

        <Card title="Follow-up queue">
          {followUps.length === 0 ? (
            <p className="text-sm text-muted">No follow-ups pending.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {followUps.map((e) => {
                const p = e.patient;
                return (
                  <li key={e._id.toString()} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" dir="auto">{p?.fullName || "Unknown"}</p>
                      <p className="text-xs text-muted">{p?.medicalNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">{formatDate(e.openedAt)}</span>
                      <Link href={`/ward/${e._id}`} className="text-xs text-primary font-medium">
                        Open →
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
