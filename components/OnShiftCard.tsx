type ShiftPerson = { id: string; name: string; category: string; startTime?: string | null; endTime?: string | null };
type ShiftInfo = { startHour: number; activeDateKey: string; beforeStart: boolean };
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import ShiftClock from "@/components/dashboard/ShiftClock";

// The signature element described in spec section 8: always visible at the
// top of the dashboard, no navigation required. The pulsing dot marks a live
// shift; respects prefers-reduced-motion globally (see app/globals.css).
// Data comes from GET /api/dashboard (people + activeShift), which already
// resolves "on shift now" against the 08:00 shift boundary.
export default function OnShiftCard({
  dayType = "Normal",
  activeShift = "Long",
  people = [] as ShiftPerson[],
  serverNow,
  shift,
  linkProfiles = false,
}: {
  dayType?: string;
  activeShift?: string;
  people?: ShiftPerson[];
  serverNow?: string;
  shift?: ShiftInfo;
  // Admin/resident: names link to the intern profile page (spec 11.8). Interns
  // see plain text — profiles are role-gated.
  linkProfiles?: boolean;
}) {
  // Highlight the people whose shift window (startTime–endTime) includes the
  // dashboard's server clock — e.g. the 08:00–16:00 long shift while it's 11:00.
  const nowMinutes = serverNow ? new Date(serverNow).getHours() * 60 + new Date(serverNow).getMinutes() : -1;
  function minutesOf(t: string | null | undefined): number | null {
    if (!t) return null;
    const m = /^(\d{1,2}):(\d{2})/.exec(t);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  return (
    <div id="on-shift-card" className="rounded-2xl bg-surface p-5 shadow-sm border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-success animate-on-shift-pulse" aria-hidden />
          <h2 className="text-sm font-semibold text-ink/70">
            On shift now{activeShift === "unassigned" ? " — no one assigned yet" : ""}
          </h2>
        </div>
        <span className="text-xs font-medium rounded-full bg-primary/10 text-primary px-2.5 py-1">
          {dayType} day
        </span>
      </div>
      {people.length === 0 ? (
        <EmptyState title="No shift assigned yet for this slot." className="py-6" />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {people.map((p) => {
            const start = minutesOf(p.startTime);
            const end = minutesOf(p.endTime);
            const inWindow = start !== null && end !== null && nowMinutes >= start && nowMinutes < end;
            return (
              <li key={p.name} className="flex flex-wrap items-center justify-between gap-1 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  {start !== null && end !== null ? (
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${inWindow ? "bg-success" : "bg-border"}`}
                      title={inWindow ? "On duty right now" : `Shift window ${p.startTime}–${p.endTime}`}
                    />
                  ) : null}
                  {linkProfiles && p.id ? (
                    <Link
                      href={`/admin/users/${p.id}`}
                      className={`font-medium truncate hover:text-primary hover:underline ${inWindow ? "text-ink" : ""}`}
                      dir="auto"
                    >
                      {p.name}
                    </Link>
                  ) : (
                    <span className={`font-medium truncate ${inWindow ? "text-ink" : ""}`} dir="auto">{p.name}</span>
                  )}
                </span>
                <span className="text-muted whitespace-nowrap">{p.category}</span>
              </li>
            );
          })}
        </ul>
      )}
      <ShiftClock serverNow={serverNow} shift={shift} />
    </div>
  );
}
