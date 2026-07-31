# HPB Department App — Starter Scaffold

This is the real project skeleton for the Hepatobiliary Surgery Department app, matching
`HPB_App_Build_Spec.md`. It's not feature-complete — it's the foundation (step 1 of the
build order, section 9) plus the shape of everything else, ready for OpenCode to build
into from here.

## What's here

- Next.js 14 (App Router) + TypeScript + Tailwind, with the design tokens from spec section 8
  already wired into `tailwind.config.ts` and the font stack in `app/layout.tsx`
- `AppShell` (sidebar/mobile nav) and `OnShiftCard` (the dashboard signature element)
- MongoDB connection helper (`lib/mongodb.ts`)
- Auth.js credentials login enforcing the account lifecycle rules from spec section 10
  (`lib/auth.ts`) — pending/removed/expired accounts are blocked at login
- `lib/models/types.ts` — TypeScript interfaces for every collection in spec section 3.
  **Keep this in sync with the spec as the schema evolves.**
- `scripts/seed.ts` — seeds `CaseTypeTemplate` (Hernia/Biliary/Hepatic) and
  `RoleSlotDefinition` (the full shift rulebook) so there's real data to build against
- Placeholder pages for every module (Dashboard, Ward, Clinic, Emergency, Roster, Admin, Login)

## What's NOT here yet (this is the actual build work — see spec section 9)

- Any of the CRUD API routes (Patient, Encounter, ClinicalNote, LabPanel, etc.)
- The dynamic clinical note form (case-type-driven LE checklist)
- The Ward Male/Female day-by-day view
- LabImport (PDF parsing)
- Roster bulk-generate / 8-week pre-fill
- Registration approval queue + rotation Excel import/export
- Offline queue (IndexedDB)

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - A free MongoDB Atlas M0 cluster connection string
   - A random `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
3. `npm run seed` — populates the case-type templates and shift rulebook
4. `npm run dev` — runs locally at http://localhost:3000
5. Deploy: push to a GitHub repo, import it into Vercel (Hobby/free tier), add the same
   environment variables in the Vercel project settings.

## Continuing the build in OpenCode

Point OpenCode at this folder plus `HPB_App_Build_Spec.md` and work through the Build
Order in spec section 9, one numbered step at a time. Each collection's exact shape is
already defined in `lib/models/types.ts` and spec section 3 — the priority is wiring up
real API routes and UI against that shape, not re-deciding it.
