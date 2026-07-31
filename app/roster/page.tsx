import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import RosterBoard from "@/components/roster/RosterBoard";
import { getDb } from "@/lib/mongodb";
import { requireSession } from "@/lib/api";
import type { User, RoleSlotDefinition, ShiftAssignment, DayTypeCalendar } from "@/lib/models/types";

export default async function RosterPage() {
  const session = await requireSession();
  const db = await getDb();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + 14);

  const [users, slots, assignments, calendar] = await Promise.all([
    db.collection<User>("users").find({ status: "active" }).project({ passwordHash: 0 }).sort({ fullName: 1 }).toArray(),
    db.collection<RoleSlotDefinition>("roleSlotDefinitions").find().toArray(),
    db.collection<ShiftAssignment>("shiftAssignments").find({ date: { $gte: today, $lt: end } }).toArray(),
    db.collection<DayTypeCalendar>("dayTypeCalendar").find({ date: { $gte: today, $lt: end } }).toArray(),
  ]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <PageHeader title="Roster" subtitle="Shift assignments for the next 14 days" />
        <RosterBoard
          users={JSON.parse(JSON.stringify(users))}
          slots={JSON.parse(JSON.stringify(slots))}
          assignments={JSON.parse(JSON.stringify(assignments))}
          calendar={JSON.parse(JSON.stringify(calendar))}
        />
      </div>
    </AppShell>
  );
}
