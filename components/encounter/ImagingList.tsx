"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { apiFetch } from "@/lib/client-api";
import type { ImagingRequest } from "@/lib/models/types";

const statusTone = (status: string) =>
  status === "resulted" ? "success" : status === "scheduled" ? "info" : "default";

function formatDateOnly(date: string | Date | undefined) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString();
}

export default function ImagingList({
  imaging,
  canManage = true,
}: {
  imaging: ImagingRequest[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Record<string, string>>({});
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("");
  const [schedInstructions, setSchedInstructions] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function update(id: string, payload: Record<string, unknown>) {
    setError("");
    setLoading(true);
    const res = await apiFetch(`/api/imaging-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Could not update imaging request");
      return;
    }
    setExpanded({});
    setResult("");
    router.refresh();
  }

  return (
    <div>
      {imaging.length === 0 ? (
        <p className="text-sm text-muted mb-3">No imaging requested.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border mb-3">
          {imaging.map((im) => {
            const expandedPanel = expanded[im._id!.toString()];
            return (
              <li key={im._id!.toString()} className="py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {im.modality}
                      {im.modalityDetail ? ` (${im.modalityDetail})` : ""} — {im.partToBeExamined}
                    </p>
                    {im.result ? (
                      <p className="text-xs text-ink/70 mt-0.5" dir="auto">{im.result}</p>
                    ) : (
                      <p className="text-xs text-muted mt-0.5">{im.clinicalDiagnosis}</p>
                    )}
                    {im.appointment?.date && (
                      <p className="text-xs text-muted mt-0.5">
                        Appointment: {formatDateOnly(im.appointment.date)}
                        {im.appointment.time ? ` · ${im.appointment.time}` : ""}
                        {im.appointment.instructions ? ` · ${im.appointment.instructions}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge tone={statusTone(im.status) as any} className="whitespace-nowrap">{im.status}</Badge>
                    {canManage && (
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpanded({ ...expanded, [im._id!.toString()]: expandedPanel === "schedule" ? "" : "schedule" })}
                        >
                          {im.appointment ? "Reschedule" : "Schedule"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpanded({ ...expanded, [im._id!.toString()]: expandedPanel === "result" ? "" : "result" })}
                        >
                          {im.result ? "Edit result" : "Enter result"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {expandedPanel === "schedule" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      update(im._id!.toString(), {
                        status: "scheduled",
                        appointment: { date: schedDate ? new Date(schedDate) : null, time: schedTime, instructions: schedInstructions },
                      });
                    }}
                    className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end"
                  >
                    <div>
                      <Label>Date</Label>
                      <Input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} required />
                    </div>
                    <div>
                      <Label>Time</Label>
                      <Input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} />
                    </div>
                    <div>
                      <Label>Instructions</Label>
                      <Input value={schedInstructions} onChange={(e) => setSchedInstructions(e.target.value)} placeholder="e.g. NPO 6h, with contrast" />
                    </div>
                    <div className="sm:col-span-3 flex gap-2">
                      <Button type="submit" size="sm" loading={loading}>Save schedule</Button>
                      <Button variant="ghost" size="sm" onClick={() => setExpanded({})}>Cancel</Button>
                    </div>
                  </form>
                )}

                {expandedPanel === "result" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      update(im._id!.toString(), { status: "resulted", result });
                    }}
                    className="mt-2 flex flex-col gap-2"
                  >
                    <div>
                      <Label>Result / report text</Label>
                      <Textarea rows={3} dir="auto" value={result} onChange={(e) => setResult(e.target.value)} placeholder="Radiology report…" required />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" loading={loading}>{im.result ? "Update result" : "Attach result"}</Button>
                      <Button variant="ghost" size="sm" onClick={() => setExpanded({})}>Cancel</Button>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && <p className="text-xs text-danger mb-2">{error}</p>}
    </div>
  );
}
