"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { DAY_TYPES } from "@/lib/constants";
import { apiFetch } from "@/lib/client-api";

type User = { _id: string; fullName: string; role: string };
type Slot = { _id: string; dayType: string; personType: string; shiftType: string; category: string; label: string; weekdays?: number[] };
type Assignment = { _id: string; date: string; roleSlotDefinitionId: string; userIds: string[]; startTime?: string | null; endTime?: string | null };
type Pool = { _id: string; date: string; shiftType: "long" | "night"; userIds: string[] };
type CalendarDay = { _id: string; date: string; dayType: string; surgeryOverlay: boolean };

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function RosterBoard({ users, slots, assignments, calendar, pools, selfBook = false, currentUserId = "", initialDay = "", canManage = false, canSetDayType = false }: {
  users: User[];
  slots: Slot[];
  assignments: Assignment[];
  calendar: CalendarDay[];
  pools: Pool[];
  selfBook?: boolean;
  currentUserId?: string;
  initialDay?: string;
  canManage?: boolean;
  canSetDayType?: boolean;
}) {
  const router = useRouter();
  // The selected day lives in the ?day= query param so router.refresh() (which
  // remounts this component) doesn't bounce the board back to today after a
  // toggle or self-booking. Server and client both read the same URL, so there
  // is no hydration mismatch.
  const [selected, setSelected] = useState<string>(() => (initialDay || dateKey(new Date())));
  const selectDay = (key: string) => {
    setSelected(key);
    router.replace(`/roster?day=${key}`, { scroll: false });
  };
  const [bulkFrom, setBulkFrom] = useState(dateKey(new Date()));
  const [bulkTo, setBulkTo] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const days = useMemo(() => {
    const list: { key: string; date: Date; cal?: CalendarDay }[] = [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 56; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = dateKey(d);
      list.push({ key, date: d, cal: calendar.find((c) => dateKey(new Date(c.date)) === key) });
    }
    return list;
  }, [calendar]);

  const selectedDay = days.find((d) => d.key === selected);
  const dayType = selectedDay?.cal?.dayType || "normal";
  const weekday = selectedDay?.date.getDay();

  const daySlots = slots.filter((s) => {
    if (s.dayType !== dayType) return false;
    if (Array.isArray(s.weekdays) && s.weekdays.length > 0 && weekday !== undefined && !s.weekdays.includes(weekday)) return false;
    return true;
  });

  const surgerySlots = selectedDay?.cal?.surgeryOverlay
    ? slots.filter((s) => s.dayType === "normal" && s.shiftType === "surgery-partial")
    : [];

  const visibleSlots = [...daySlots, ...surgerySlots];

  const dayPools = dayType === "emergency"
    ? pools.filter((p) => dateKey(new Date(p.date)) === selected)
    : [];

  const assignmentMap = useMemo(() => {
    const m = new Map<string, Assignment>();
    for (const a of assignments) {
      // Key by the LOCAL calendar date (same as dateKey/selected). Dates are
      // stored at local midnight and serialize to the previous day in UTC, so
      // slicing the raw ISO string would shift every assignment a day early.
      const key = `${dateKey(new Date(a.date))}:${a.roleSlotDefinitionId}`;
      m.set(key, a);
    }
    return m;
  }, [assignments]);

  const userById = useMemo(() => new Map(users.map((u) => [u._id, u])), [users]);

  async function setDayType(dayType: string, surgeryOverlay: boolean) {
    setError("");
    const res = await apiFetch("/api/day-type-calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selected, dayType, surgeryOverlay }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not update day type");
      return;
    }
    setMessage(`Saved ${selected} as ${dayType} day. Regenerate slots if needed.`);
    router.refresh();
  }

  async function toggleUser(slotId: string, userId: string) {
    setError("");
    const res = await apiFetch("/api/shift/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selected, roleSlotDefinitionId: slotId, userId }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not update assignment");
      return;
    }
    router.refresh();
  }

  async function claimSlot(slotId: string) {
    setError("");
    const res = await apiFetch("/api/shift/self-book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selected, roleSlotDefinitionId: slotId }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not update booking");
      return;
    }
    router.refresh();
  }

  async function bulkGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!bulkTo) {
      setError("Pick an end date");
      return;
    }
    const res = await apiFetch("/api/shift/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: bulkFrom, to: bulkTo }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Bulk generate failed");
      return;
    }
    const d = await res.json();
    setMessage(`Generated ${d.created} slots for ${d.from} → ${d.to}`);
    router.refresh();
  }

  const candidatesFor = (s: Slot) =>
    users.filter((u) => (u.role === s.personType || s.personType === "intern") && !(assignmentMap.get(`${selected}:${s._id}`)?.userIds || []).includes(u._id));

  return (
    <div className="flex flex-col gap-5">
      {selfBook && (
        <p className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary">
          Self-booking mode: claim any open intern shift within the next 8 weeks. You can be on at most one shift per day.
        </p>
      )}

      {canManage && (
      <Card title="Bulk generate slots">
        <form onSubmit={bulkGenerate} className="flex flex-wrap items-end gap-3">
          <div>
            <Label>From</Label>
            <Input type="date" value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)} />
          </div>
          <div>
            <Label>To</Label>
            <Input type="date" value={bulkTo} onChange={(e) => setBulkTo(e.target.value)} />
          </div>
          <Button type="submit" size="sm">Generate</Button>
        </form>
        <p className="text-xs text-muted mt-2">
          Creates empty slots from the day-type calendar. Fill them here, or upload the rotation roster Excel above.
        </p>
      </Card>
      )}

      {message && <p className="text-xs text-success">{message}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}

      {/* Day picker */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-7 gap-1.5 min-w-max">
          {days.map((d) => (
            <button
              key={d.key}
              onClick={() => selectDay(d.key)}
              className={`rounded-lg border p-1.5 text-center text-xs ${selected === d.key ? "border-primary bg-primary/10" : "border-border"}`}
            >
              <span className="block font-medium whitespace-nowrap">{d.date.toLocaleDateString("en-GB", { weekday: "short" })}</span>
              <span className="block text-muted whitespace-nowrap">{d.date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              <span className={`mt-0.5 block text-[10px] font-medium whitespace-nowrap ${d.cal ? "text-primary" : "text-muted"}`}>
                {d.cal?.dayType || "normal"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Card title={`${selected} — ${dayType} day`}>
        {canSetDayType && (
        <div className="flex flex-wrap gap-2 mb-4">
          {DAY_TYPES.map((dt) => (
            <button
              key={dt.value}
              onClick={() => setDayType(dt.value, selectedDay?.cal?.surgeryOverlay || false)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md ${dayType === dt.value ? "bg-primary text-white" : "bg-ink/5 text-muted"}`}
            >
              {dt.label}
            </button>
          ))}
          <button
            onClick={() => setDayType(dayType, !(selectedDay?.cal?.surgeryOverlay || false))}
            className={`px-2.5 py-1 text-xs font-medium rounded-md ${selectedDay?.cal?.surgeryOverlay ? "bg-warning/20 text-warning" : "bg-ink/5 text-muted"}`}
          >
            Surgery overlay: {selectedDay?.cal?.surgeryOverlay ? "ON" : "off"}
          </button>
        </div>
        )}

        {dayType === "emergency" && (
          <div className="mb-4 rounded-lg bg-primary/5 border border-primary/20 p-3">
            <p className="text-xs font-semibold text-primary mb-2">Emergency duty pool (from rotation import)</p>
            {dayPools.length === 0 ? (
              <p className="text-xs text-muted">No pool imported for this day. Import the rotation roster, then fine-split Route/Ward/Typing below.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {dayPools.map((p) => (
                  <li key={p._id} className="text-xs flex items-center justify-between">
                    <span className="font-medium capitalize">{p.shiftType} shift</span>
                    <span>
                      {p.userIds.length === 0 ? (
                        <span className="text-muted">empty</span>
                      ) : (
                        p.userIds.map((id) => userById.get(id)?.fullName || "Unknown").join(", ")
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {visibleSlots.length === 0 ? (
          <p className="text-sm text-muted">
            No slots defined for {dayType} days — bulk-generate first, or check RoleSlotDefinitions.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {visibleSlots.map((s) => {
              const a = assignmentMap.get(`${selected}:${s._id}`);
              const assigned = a?.userIds || [];
              return (
                <li key={s._id} className="py-2.5 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.label}</p>
                    <p className="text-xs text-muted">
                      {s.personType} · {s.shiftType}{s.category !== "none" ? ` · ${s.category}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 w-full sm:w-auto min-w-0">
                    {assigned.length > 0 && (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {assigned.map((id) => {
                          const u = userById.get(id);
                          const isMe = id === currentUserId;
                          return (
                            <span
                              key={id}
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${isMe ? "bg-success/15 text-success" : "bg-primary/10 text-primary"}`}
                            >
                              {u?.fullName || "Unknown"}{isMe ? " (you)" : ""}
                              {canManage && (
                                <button
                                  type="button"
                                  aria-label={`Remove ${u?.fullName || "user"}`}
                                  onClick={() => toggleUser(s._id, id)}
                                  className="text-primary/60 hover:text-danger"
                                >
                                  ×
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {selfBook ? (
                      s.personType === "intern" && (
                        <Button
                          size="sm"
                          variant={assigned.includes(currentUserId) ? "secondary" : undefined}
                          onClick={() => claimSlot(s._id)}
                        >
                          {assigned.includes(currentUserId) ? "Relinquish" : "Claim"}
                        </Button>
                      )
                    ) : canManage ? (
                      <>
                        {candidatesFor(s).length > 0 && (
                          <Select
                            className="w-full sm:w-44"
                            value=""
                            onChange={(e) => e.target.value && toggleUser(s._id, e.target.value)}
                          >
                            <option value="">{assigned.length > 0 ? "+ Add person" : "— assign —"}</option>
                            {candidatesFor(s).map((u) => (
                              <option key={u._id} value={u._id} dir="auto">{u.fullName} ({u.role})</option>
                            ))}
                          </Select>
                        )}
                        {assigned.length === 0 && candidatesFor(s).length === 0 && (
                          <span className="text-xs text-muted">No candidates</span>
                        )}
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
