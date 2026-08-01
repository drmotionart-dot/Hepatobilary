// Onboarding tour steps (spec 14). Bundled in the app — never fetched at
// runtime — so the tour works on first load with no connectivity. Each step
// navigates to a real page and spotlights `selector`; when the selector is
// missing (or absent entirely) the tour shows a centered fallback card.

export type TourStep = {
  title: string;
  body: string;
  path: string;
  /** Element to spotlight on `path`; omit for a centered fallback card. */
  selector?: string;
};

export type TourProfile = {
  role: "intern" | "resident" | "admin";
  grantedCapabilities?: string[];
  mustChangePassword?: boolean;
};

export function buildTourSteps(profile: TourProfile): TourStep[] {
  const caps = profile.grantedCapabilities || [];
  const bypass = caps.includes("bypass-shift-key");

  const shiftKeyBody = bypass
    ? "You hold the bypass-shift-key capability, so you can submit patient forms without entering the key."
    : "Every day a resident shares the ward shift key. You enter it once here and it is attached to your patient-data actions automatically.";

  switch (profile.role) {
    case "intern":
      return [
        {
          title: "Home — what's on right now",
          body: "This is your dashboard. The top card shows who is on shift right now; the calendar below shows every day in the month and how many people are assigned.",
          path: "/dashboard",
          selector: "#on-shift-card",
        },
        {
          title: "Ward shift key",
          body: shiftKeyBody,
          path: "/dashboard",
          selector: "#shift-key-card",
        },
        {
          title: "Find a patient",
          body: "Use this search box in the top bar to jump straight to any patient's active case by name or medical number.",
          path: "/dashboard",
          selector: "#global-search",
        },
        {
          title: "Ward",
          body: "Open, follow and document ward cases here — clinical notes, vitals, labs, treatments and imaging.",
          path: "/ward",
          selector: "#page-title",
        },
        {
          title: "Clinic",
          body: "Outpatient clinic encounters live here, including LE checklists, risk factors and diet instructions per case type.",
          path: "/clinic",
          selector: "#page-title",
        },
        {
          title: "Emergency",
          body: "Emergency presentations are documented here against the same case-type templates.",
          path: "/emergency",
          selector: "#page-title",
        },
        {
          title: "Lab imports",
          body: "Drop a lab PDF here and review imported results against each patient's panel.",
          path: "/lab-import",
          selector: "#page-title",
        },
        {
          title: "Follow-ups",
          body: "The dashboard keeps your follow-up queue front and centre so nothing slips between rounds.",
          path: "/dashboard",
        },
      ];
    case "resident":
      return [
        {
          title: "Shift key",
          body: "Generate and rotate the ward shift key here. The intern tour tells them to enter the key you show them.",
          path: "/dashboard",
          selector: "#shift-key-card",
        },
        {
          title: "Roster",
          body: "Manage the 8-week roster: set day types (normal/clinic/emergency + surgery overlay), bulk-generate slots, import the Wardyati rotation Excel, and assign or mark interns absent.",
          path: "/roster",
          selector: "#page-title",
        },
        {
          title: "Marking an intern absent",
          body: "On any assigned slot, click Absent on the intern's chip, type the reason, and it's recorded on the roster, dashboard and their attendance — their name stays on the shift, struck through.",
          path: "/roster",
        },
        {
          title: "Ward — discharge & operations",
          body: "Finalize discharges and complete operation forms from inside an active ward case.",
          path: "/ward",
          selector: "#page-title",
        },
        {
          title: "Round Interns",
          body: "Every active intern on the current round, each linking to their profile — roster history, attendance and audit trail. This is also where the rotation import lives.",
          path: "/admin/interns",
          selector: "#page-title",
        },
        {
          title: "Audit log",
          body: "Every write across the system, attributed to the person who made it. Residents hold a lot of power in this app — this is how it stays accountable.",
          path: "/admin/audit",
          selector: "#page-title",
        },
        {
          title: "Templates & mappings",
          body: "Your resident panel also includes case-type templates, custom form templates and lab test mappings — everything operational, without account management.",
          path: "/admin/templates",
          selector: "#page-title",
        },
      ];
    case "admin":
      return [
        {
          title: "Shift key",
          body: "Generate and rotate the ward shift key. Residents and interns rely on the key shown here.",
          path: "/dashboard",
          selector: "#shift-key-card",
        },
        {
          title: "Users & approvals",
          body: "Approve self-registered interns and manage every account's lifecycle. This screen is admin-only.",
          path: "/admin/users",
          selector: "#page-title",
        },
        {
          title: "Capability grants",
          body: "On any intern's profile you can grant granular capabilities — manage-roster, finalize-discharge, bypass-shift-key and more.",
          path: "/admin/users",
        },
        {
          title: "Case type templates",
          body: "LE checklists, risk factors, lab presets and diet instructions per case type, driving the ward/clinic/emergency forms.",
          path: "/admin/templates",
          selector: "#page-title",
        },
        {
          title: "Form templates",
          body: "Define custom departmental forms that residents and interns can fill on patient cases.",
          path: "/admin/forms",
          selector: "#page-title",
        },
        {
          title: "Lab mappings",
          body: "Map PDF test names to your internal lab panel keys so imported results land in the right place.",
          path: "/lab-import/mappings",
          selector: "#page-title",
        },
        {
          title: "Roster",
          body: "Set day types, bulk-generate slots, import the rotation roster and assign or mark interns absent.",
          path: "/roster",
          selector: "#page-title",
        },
        {
          title: "Round Interns & audit",
          body: "Residents reach interns through Round Interns and every change is visible in the audit log — your backstop for accountability.",
          path: "/admin/interns",
          selector: "#page-title",
        },
      ];
  }
}
