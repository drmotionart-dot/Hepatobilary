import Link from "next/link";
import AppShell from "@/components/AppShell";
import OnShiftCard from "@/components/OnShiftCard";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireSession } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Encounter, LabImport } from "@/lib/models/types";

export default async function DashboardPage() {
  const session = await requireSession();
  const db = await getDb();

  // On-shift data for today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const dayTypeDoc = await db.collection("dayTypeCalendar").findOne({ date: { $gte: startOfDay, $lt: endOfDay } });
  const dayType = (dayTypeDoc?.dayType as string) || "normal";

  const assignments = await db.collection("shiftAssignments")
    .find({ date: { $gte: startOfDay, $lt: endOfDay } })
    .toArray();

  const userIds = [...new Set(assignments.filter((a) => a.userId).map((a) => a.userId.toString()))];
  const users = userIds.length
    ? await db.collection("users").find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } }).toArray()
    : [];
  const userMap = new Map(users.map((u: any) => [u._id.toString(), u.fullName]));

  const slotIds = assignments.map((a) => a.roleSlotDefinitionId.toString());
  const slots = slotIds.length
    ? await db.collection("roleSlotDefinitions").find({ _id: { $in: slotIds.map((id) => new ObjectId(id)) } }).toArray()
    : [];
  const slotMap = new Map(slots.map((s: any) => [s._id.toString(), s.label]));

  const people = assignments
    .filter((a) => a.userId)
    .map((a) => ({
      name: userMap.get(a.userId.toString()) || "Unknown",
      category: slotMap.get(a.roleSlotDefinitionId.toString()) || "",
    }));

  // Counters
  const [activeWard, followUpPending, needsReviewImports] = await Promise.all([
    db.collection<Encounter>("encounters").countDocuments({ status: "active", type: "ward" }),
    db.collection<Encounter>("encounters").countDocuments({ status: "follow-up-pending" }),
    db.collection<LabImport>("labImports").countDocuments({ status: "needs-review" }),
  ]);

  const followUps = await db.collection<Encounter>("encounters")
    .find({ status: "follow-up-pending" })
    .sort({ openedAt: -1 })
    .limit(5)
    .toArray();
  const followUpPatientIds = [...new Set(followUps.map((e) => e.patientId.toString()))];
  const patients = followUpPatientIds.length
    ? await db.collection("patients").find({ _id: { $in: followUpPatientIds.map((id) => new ObjectId(id)) } }).toArray()
    : [];
  const patientMap = new Map(patients.map((p: any) => [p._id.toString(), p]));

  const activeShift = assignments.some((a) => a.userId) ? "assigned" : "unassigned";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto p-4 md:p-8 flex flex-col gap-6">
        <OnShiftCard
          dayType={dayType}
          activeShift={activeShift}
          people={people}
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card className="!p-4">
            <p className="text-xs text-ink/50">Active ward patients</p>
            <p className="text-2xl font-semibold mt-1">{activeWard}</p>
          </Card>
          <Card className="!p-4">
            <p className="text-xs text-ink/50">Follow-ups pending</p>
            <p className="text-2xl font-semibold mt-1">{followUpPending}</p>
          </Card>
          <Link href="/lab-import/needs-review" className="col-span-2 md:col-span-1">
            <Card className="!p-4 h-full">
              <p className="text-xs text-ink/50">Lab imports awaiting review</p>
              <p className="text-2xl font-semibold mt-1">
                <Badge tone={needsReviewImports > 0 ? "warning" : "success"}>{needsReviewImports}</Badge>
              </p>
            </Card>
          </Link>
        </div>

        <Card title="Follow-up queue">
          {followUps.length === 0 ? (
            <p className="text-sm text-ink/50">No follow-ups pending.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-black/5">
              {followUps.map((e) => {
                const p = patientMap.get(e.patientId.toString()) as any;
                return (
                  <li key={e._id!.toString()} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{p?.fullName || "Unknown"}</p>
                      <p className="text-xs text-ink/50">{p?.medicalNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink/50">{formatDate(e.openedAt)}</span>
                      <Link href={`/ward/${e._id}`} className="text-xs text-primary font-medium">
                        Open â†’
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

