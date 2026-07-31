import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import RosterBoard from "@/components/roster/RosterBoard";
import { requireSession, apiFetchServer } from "@/lib/api";

// Wire format from GET /api/roster/board — dates and _ids arrive as strings.
type RosterBoardData = {
  users: { _id: string; fullName: string; role: string }[];
  slots: { _id: string; dayType: string; personType: string; shiftType: string; category: string; label: string }[];
  assignments: { _id: string; date: string; roleSlotDefinitionId: string; userId: string | null; startTime?: string | null; endTime?: string | null }[];
  calendar: { _id: string; date: string; dayType: string; surgeryOverlay: boolean }[];
};

export default async function RosterPage() {
  const session = await requireSession();
  if (!session) redirect("/login");

  const data = await apiFetchServer<RosterBoardData>("/api/roster/board");
  if (!data) redirect("/login");

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <PageHeader title="Roster" subtitle="Shift assignments for the next 14 days" />
        <RosterBoard
          users={data.users}
          slots={data.slots}
          assignments={data.assignments}
          calendar={data.calendar}
        />
      </div>
    </AppShell>
  );
}
