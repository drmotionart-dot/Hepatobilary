type ShiftPerson = { name: string; category: string };
import EmptyState from "@/components/ui/EmptyState";

// The signature element described in spec section 8: always visible at the
// top of the dashboard, no navigation required. The pulsing dot marks a live
// shift; respects prefers-reduced-motion globally (see app/globals.css).
// Data comes from GET /api/dashboard (people + activeShift).
export default function OnShiftCard({
  dayType = "Normal",
  activeShift = "Long",
  people = [] as ShiftPerson[]
}) {
  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-3">
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
          {people.map((p) => (
            <li key={p.name} className="flex items-center justify-between text-sm">
              <span className="font-medium">{p.name}</span>
              <span className="text-ink/50">{p.category}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
