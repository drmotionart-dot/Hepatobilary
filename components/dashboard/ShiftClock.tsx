"use client";

import { useEffect, useState } from "react";
import { SHIFT_START_HOUR } from "@/lib/constants";

type ShiftInfo = { startHour: number; activeDateKey: string; beforeStart: boolean };

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// Built-in clock for the dashboard. It ticks locally but initializes from the
// server's clock so SSR and the first client render are identical (no hydration
// mismatch). It renders the live time plus the 08:00 shift window — before
// 08:00 the previous day's 24-hour shift is still the active one.
export default function ShiftClock({ serverNow, shift }: { serverNow?: string; shift?: ShiftInfo }) {
  const [now, setNow] = useState<Date>(() => (serverNow ? new Date(serverNow) : new Date()));

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const startHour = shift?.startHour ?? SHIFT_START_HOUR;
  const beforeStart = shift?.beforeStart ?? false;
  const activeDate = shift?.activeDateKey ?? "";

  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
      <div>
        <div className="font-mono text-lg leading-none tabular-nums">{fmtTime(now)}</div>
        <div className="mt-1 text-xs text-muted">{fmtDate(now)}</div>
      </div>
      <div className="text-right text-xs">
        <div className="font-medium text-primary">
          Shift window {String(startHour).padStart(2, "0")}:00 → {String(startHour).padStart(2, "0")}:00
        </div>
        <div className="mt-0.5 text-muted">
          {beforeStart ? `Night shift — from ${activeDate || "yesterday"}` : `Day shift — ${activeDate || "today"}`}
        </div>
      </div>
    </div>
  );
}
