"use client";

import { useEffect, useState } from "react";
import { NIGHT_START_HOUR, SHIFT_START_HOUR } from "@/lib/constants";

type ShiftInfo = { startHour: number; nightStartHour: number; activeDateKey: string; isNight: boolean };

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// "8" → "8:00 AM", "20" → "8:00 PM" — 12-hour clock for the shift window.
function fmtHour(h: number) {
  const hour12 = h % 12 || 12;
  const ampm = h < 12 ? "AM" : "PM";
  return `${hour12}:00 ${ampm}`;
}

// Built-in clock for the dashboard. It ticks locally but initializes from the
// server's clock so SSR and the first client render are identical (no hydration
// mismatch). It renders the live time plus the current shift half — the LONG
// shift (08:00–20:00) or the NIGHT shift (20:00–08:00), anchored to the
// 08:00 shift-day boundary the server resolves.
export default function ShiftClock({ serverNow, shift }: { serverNow?: string; shift?: ShiftInfo }) {
  const [now, setNow] = useState<Date>(() => (serverNow ? new Date(serverNow) : new Date()));

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const startHour = shift?.startHour ?? SHIFT_START_HOUR;
  const nightStartHour = shift?.nightStartHour ?? NIGHT_START_HOUR;
  const isNight = shift?.isNight ?? false;
  const activeDate = shift?.activeDateKey ?? "";

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
      <div>
        <div className="font-mono text-lg leading-none tabular-nums whitespace-nowrap">{fmtTime(now)}</div>
        <div className="mt-1 text-xs text-muted whitespace-nowrap">{fmtDate(now)}</div>
      </div>
      <div className="text-right text-xs min-w-0">
        <div className="font-medium text-primary">
          {isNight
            ? `Night shift window ${fmtHour(nightStartHour)} → ${fmtHour(startHour)}`
            : `Long shift window ${fmtHour(startHour)} → ${fmtHour(nightStartHour)}`}
        </div>
        <div className="mt-0.5 text-muted">
          {isNight ? `Night shift — from ${activeDate || "yesterday"}` : `Long shift — ${activeDate || "today"}`}
        </div>
      </div>
    </div>
  );
}
