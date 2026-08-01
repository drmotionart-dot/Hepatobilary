# Mobile / Role-Gating / Navigation Audit Report

Date: 2026-08-01
Scope: systematic in-session audit of three bug classes across the whole app,
fixes applied and verified end-to-end on real phone viewports.

## Class 1 — Mobile responsive overflow

Audit: admin walked every route at 375x667 and 320x568 with a per-element
bounding-box scan (fixed/absolute + hidden + genuine scroll-strip children
excluded). Any element crossing the viewport counts as a failure.

### Root cause
`AppShell`'s `<main>` was a flex item without `min-w-0`, so any inner
`min-w-max` scroll strip (roster/ward day pickers, tables) propagated its
min-content and stretched the entire page wide at phone widths.

### Found → Fixed
| Area | Fix |
|---|---|
| AppShell main (global) | added `min-w-0` to `<main className="flex-1">` |
| globals.css (global) | added `html, body { overflow-x: clip }` safety net |
| Ward 56-day picker | wrapped in `overflow-x-auto` strip (already), works once main min-w-0 lands |
| RosterBoard day picker | `overflow-x-auto` + `min-w-max` strip; slot rows `flex flex-wrap`; slot select `w-full sm:w-44`; action column `w-full sm:w-auto min-w-0` |
| RosterImportCard / UsersManager file inputs | wrapper `flex-1 min-w-0`, input `w-full max-w-full` (file input min-content was 286px, exceeding a 320 card) |
| Admin audit filter grid | `grid-cols-2` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-5` (two 317px cells could not fit 320px) |
| NewCaseForm / EmergencyAssessmentForm / CreateAccountModal | `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` + `col-span-full sm:col-span-2` |
| Ward list header / patient cards | `flex-wrap`, badge `max-w-[45vw] truncate`, day pill `whitespace-nowrap` |
| Clinic / emergency list rows | same wrap + truncate pattern |
| AddNoteForm context row | `flex flex-wrap gap-2` |
| ShiftKeyCard key row | stack on mobile (`flex-col sm:flex-row`) |
| OnShiftCard | header + people rows `flex-wrap`, truncate names |
| ShiftClock | `flex-wrap` + `whitespace-nowrap` |
| CalendarCard | day-type letter `hidden sm:block` |
| ImagingList / ReviewQueue / ward note header / TemplateManager / UsersManager rows | `flex-wrap`, `min-w-0`, `truncate`, `whitespace-nowrap` as needed |
| MobileNav (7 tabs) | `px-0.5 leading-tight` |
| TopBar | search `min-w-0`; ShiftKeyBadge `hidden sm:block`; account menu handles small screens |
| AppShell nav labels | "Dashboard"→"Home", "Lab import"→"Labs" (shorter tabs) |

### Result
All 16 admin routes (incl. `/ward/[id]`, `/admin/*`) overflow-clean at both
375x667 and 320x568. Desktop re-checked via the 62-check Phase-5 regression
(green) and manual desktop walkthrough.

## Class 2 — Role gating correctness (spec §7)

### Found → Fixed
| Finding | Fix |
|---|---|
| Backend rotation template download `[admin]`-only, but residents perform the roster round-trip | `app/api/admin/users/template/route.ts` → `requireRole(["admin","resident"])` |
| Admin saw dead write forms on `/ward/[id]` (Add note/lab/imaging/referral/treatment, generic form fill) that would 403 on submit | `canDocument = intern‖resident` gates all six forms + `FormRecords canFill` + `ImagingList canManage` |
| Admin saw dead NewCaseForm, EmergencyAssessmentForm, ward "+ Open new case (clinic)", lab-import uploader | all hidden for admin |
| Intern saw "Mark done" on referrals though PATCH is `[resident,admin]` | `ReferralReview` gained `role` prop; button only for resident/admin |
| Users page `canImport` was admin-only, blocking residents' rotation import | `canImport = admin‖resident` (manual create stays admin-only) |

### Verified
Admin: no dead forms on `/ward/[id]`, clinic, emergency, ward, lab-import.
Intern: write forms present, no "Mark done", no Admin nav.
Resident: "Mark done" present (filed a pending referral), rotation import card
+ template download present, no "+ Create".

### Residual (documented, no code change)
Spec §7 matrix says "manage users" is admin-only, but §10.1/§10.2/§11.5 grant
residents registration approval and rotation import. Code consistently follows
§10.x; flagged in Phase-5 report.

## Follow-up (2026-08-01, product decision)
Admin was granted **full clinical write**: opening new cases (clinic/emergency/
ward), importing lab PDFs, and documenting on `/ward/[id]` (notes, labs,
imaging, referrals, treatment, generic forms). Backend gates on
`encounters`, `patients`, `lab-import`, `clinical-notes`, `lab-panels`,
`treatment-logs`, `referral-consults`, `imaging-requests`, `form-records`
were widened to include `admin`; the frontend now renders the write forms for
admin in all three sections and the lab uploader. Admins remain **never**
shift-key gated (intern-only). Finalize discharge / close follow-ups /
complete operation forms stay resident-only per §7. Spec §7 matrix amended
to match.

## Class 3 — Navigation completeness

### Found → Fixed
| Finding | Fix |
|---|---|
| `/change-password` was orphaned (only reachable via forced mustChangePassword redirect) | TopBar account menu (same spot on both layouts) with "Change password" + "Sign out"; neutralized the page copy ("Set a new password… Current password") |
| `/lab-import/needs-review` | redirect stub to `/admin/lab-review` — intentional; verified it lands correctly |
| Admin subpages | already reachable via `/admin` hub; all six titles verified on mobile |

### Verified
7 bottom tabs for admin/resident, 6 for intern (no Admin); account menu →
change-password loads; needs-review → admin/lab-review.

## Bonus — Hydration mismatch (surfaced by the pageerror sweep)
`ShiftKeyCard` called `getRole()` (reads `document.cookie`) during render:
server → null, client → role, so the "Generate new key" button appeared only
after hydration → console hydration errors on `/dashboard`. Fixed by passing
`role` as a server prop (`ShiftKeyCard role={session.role}`), keeping
`getRole()` only as a fallback. All pages now pageerror-free.

## Verification summary
- `qa-mobile-audit.cjs` — 100/100 (per-element overflow @375/320 on 16 routes,
  role-gating asserts, nav completeness, account menu, needs-review redirect,
  pageerror-free).
- `qa-mobile-actions.cjs` — 15/15 (CreateAccountModal open+submit @375/320,
  intern note write with shift-key prompt @375, clinic NewCaseForm open case
  @375, overflow scans of open forms, pageerror-free).
- `qa-phase5.cjs` — 62/62 desktop regression re-run, green.
- `tsc --noEmit` + `next lint` clean on both repos; `cleanup-qa.cjs` removed 52
  QA users after testing.

## Remaining / residual
None observed. `PHASE5-REPORT.md` still tracks Phase-5 scope; this report
documents the mobile/role/navigation audit phase.
