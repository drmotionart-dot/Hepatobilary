import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { requireSession, apiFetchServer } from "@/lib/api";
import { formatDate, dayName } from "@/lib/format";
import type { Patient } from "@/lib/models/types";

type WardEncounter = {
  _id: string;
  patientId: string;
  caseType: string;
  status: string;
  openedAt: string;
  patient: Patient | null;
  lastNote: { presentingLine?: string } | null;
};

export default async function WardPage({
  searchParams,
}: {
  searchParams: { ward?: string };
}) {
  const session = await requireSession();
  if (!session) redirect("/login");

  const activeWard = searchParams.ward === "female" ? "female" : "male";
  const encounters = await apiFetchServer<WardEncounter[]>(`/api/ward?ward=${activeWard}`);
  if (!encounters) redirect("/login");

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <PageHeader
          title="Ward"
          subtitle="Active inpatients by side"
          action={
            <div className="flex gap-1 rounded-lg border border-black/10 p-1">
              <Link
                href="/ward?ward=male"
                className={`px-3 py-1 text-xs font-medium rounded-md ${activeWard === "male" ? "bg-primary text-white" : "text-ink/60"}`}
              >
                Male
              </Link>
              <Link
                href="/ward?ward=female"
                className={`px-3 py-1 text-xs font-medium rounded-md ${activeWard === "female" ? "bg-primary text-white" : "text-ink/60"}`}
              >
                Female
              </Link>
            </div>
          }
        />

        <div className="flex flex-col gap-3">
          {encounters.length === 0 ? (
            <Card>
              <p className="text-sm text-ink/50">No active {activeWard} ward patients.</p>
              <Link href="/clinic" className="mt-3 inline-block">
                <Button size="sm">Open a new case</Button>
              </Link>
            </Card>
          ) : (
            encounters.map((e) => {
              const p = e.patient;
              const lastNote = e.lastNote;
              return (
                <Link key={e._id.toString()} href={`/ward/${e._id}`}>
                  <Card className="hover:border-primary/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{p?.fullName || "Unknown"}</p>
                        <p className="text-xs text-ink/50 mt-0.5">
                          {p?.medicalNumber} · {p?.age} yrs · {dayName(e.openedAt)} {formatDate(e.openedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone="info">{e.caseType}</Badge>
                        <span className="text-xs text-ink/40">→</span>
                      </div>
                    </div>
                    {lastNote && (
                      <p className="text-xs text-ink/60 mt-3 line-clamp-1">{lastNote.presentingLine || "—"}</p>
                    )}
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
