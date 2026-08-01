"use client";

import { useRouter } from "next/navigation";
import Card from "@/components/ui/Card";

type Day = { date: string; dayType: string; surgeryOverlay: boolean; assigned: number };

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_TYPE_LABEL: Record<string, string> = { normal: "N", clinic: "C", emergency: "E" };

// Compact current-month calendar for the dashboard. Today is ringed, emergency
// days are tinted, dots show how many people are assigned, and clicking a day
// jumps straight to that day on the roster board (?day=YYYY-MM-DD).
export default function CalendarCard({
  monthLabel,
  days,
  todayKey,
}: {
  monthLabel: string;
  days: Day[];
  todayKey: string;
}) {
  const router = useRouter();
  const first = new Date(`${days[0]?.date || "1970-01-01"}T00:00:00`);
  const offset = first.getDay();
  const cells: (Day | null)[] = [...Array(offset).fill(null), ...days];

  return (
    <Card title={monthLabel} className="!p-4">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 font-medium text-muted">{w}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const isToday = day.date === todayKey;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => router.push(`/roster?day=${day.date}`)}
              title={`${day.date} — ${day.dayType} day${day.assigned > 0 ? `, ${day.assigned} on shift` : ""}`}
              className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 transition-colors hover:bg-primary/10 ${
                isToday ? "bg-primary/10 ring-1 ring-primary" : day.dayType === "emergency" ? "bg-warning/10" : ""
              }`}
            >
              <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>
                {Number(day.date.slice(8, 10))}
              </span>
              <span className="absolute right-0.5 top-0.5 text-[9px] font-medium text-muted">
                {DAY_TYPE_LABEL[day.dayType] || ""}
              </span>
              {day.assigned > 0 && (
                <span className="mt-0.5 flex gap-0.5">
                  {[...Array(Math.min(day.assigned, 3))].map((_, j) => (
                    <span key={j} className="h-1 w-1 rounded-full bg-primary" />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-muted">
        Click a day to open the roster. Dots show assigned people; the ring marks today.
      </p>
    </Card>
  );
}
