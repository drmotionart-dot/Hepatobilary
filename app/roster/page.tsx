import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import RosterBoard from "@/components/roster/RosterBoard";
import RosterImportCard from "@/components/roster/RosterImportCard";
import { requireSession, getSessionCapabilities, apiFetchServer } from "@/lib/api";
import type { Capability } from "@/lib/models/types";

// Wire format from GET /api/roster/board — dates and _ids arrive as strings.
type RosterBoardData = {
  users: { _id: string; fullName: string; role: string; phone?: string }[];
  slots: { _id: string; dayType: string; personType: string; shiftType: string; category: string; label: string; weekdays?: number[] }[];
  assignments: { _id: string; date: string; roleSlotDefinitionId: string; userIds: string[]; startTime?: string | null; endTime?: string | null }[];
  calendar: { _id: string; date: string; dayType: string; surgeryOverlay: boolean }[];
  pools: { _id: string; date: string; shiftType: "long" | "night"; userIds: string[] }[];
};

export default async function RosterPage({ searchParams }: { searchParams: { day?: string } }) {
  const session = await requireSession();
  if (!session) redirect("/login");

  const data = await apiFetchServer<RosterBoardData>("/api/roster/board");
  if (!data) redirect("/login");

  // Admins and residents manage the roster; an intern needs the specific
  // grants (spec 11.7): manage-roster for import/assignments, set-day-type-
  // calendar for the day-type picker. Grants are DB-fresh (no re-login).
  const role = session.role;
  const caps = await getSessionCapabilities();
  const hasCap = (cap: Capability) => role === "admin" || role === "resident" || caps.includes(cap);
  const canManageRoster = hasCap("manage-roster");
  const canSetDayType = hasCap("set-day-type-calendar");
  // An intern holding manage-roster manages instead of self-booking.
  const selfBook = role === "intern" && !canManageRoster;
  const day = searchParams.day && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.day) ? searchParams.day : "";

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-5">
        <PageHeader title="Roster" subtitle="Shift assignments for the next 8 weeks" />
        {canManageRoster && <RosterImportCard />}
        <RosterBoard
          users={data.users}
          slots={data.slots}
          assignments={data.assignments}
          calendar={data.calendar}
          pools={data.pools}
          selfBook={selfBook}
          currentUserId={session.id}
          initialDay={day}
          canManage={canManageRoster}
          canSetDayType={canSetDayType}
        />
      </div>
    </AppShell>
  );
}
