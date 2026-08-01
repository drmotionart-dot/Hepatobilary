import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import RosterBoard from "@/components/roster/RosterBoard";
import RosterImportCard from "@/components/roster/RosterImportCard";
import { requireSession, apiFetchServer } from "@/lib/api";

// Wire format from GET /api/roster/board — dates and _ids arrive as strings.
type RosterBoardData = {
  users: { _id: string; fullName: string; role: string; phone?: string }[];
  slots: { _id: string; dayType: string; personType: string; shiftType: string; category: string; label: string; weekdays?: number[] }[];
  assignments: { _id: string; date: string; roleSlotDefinitionId: string; userIds: string[]; startTime?: string | null; endTime?: string | null }[];
  calendar: { _id: string; date: string; dayType: string; surgeryOverlay: boolean }[];
  pools: { _id: string; date: string; shiftType: "long" | "night"; userIds: string[] }[];
};

export default async function RosterPage() {
  const session = await requireSession();
  if (!session) redirect("/login");

  const data = await apiFetchServer<RosterBoardData>("/api/roster/board");
  if (!data) redirect("/login");

  const canEdit = session.role === "resident" || session.role === "admin";

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-5">
        <PageHeader title="Roster" subtitle="Shift assignments for the next 8 weeks" />
        {canEdit && <RosterImportCard />}
        <RosterBoard
          users={data.users}
          slots={data.slots}
          assignments={data.assignments}
          calendar={data.calendar}
          pools={data.pools}
        />
      </div>
    </AppShell>
  );
}
