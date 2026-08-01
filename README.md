# HPB Department App — Frontend

The UI for the Hepatobiliary Surgery Department app, matching `HPB_App_Build_Spec.md`.
This is a UI-only Next.js app that calls the JWT-secured backend API in the
`hpb-backend` repository (no MongoDB access of its own).

## What's here

- Next.js 14 (App Router) + TypeScript + Tailwind, with the design tokens from spec
  section 8 wired into `tailwind.config.ts` and the font stack in `app/layout.tsx`
- `AppShell` (sidebar/mobile nav), `TopBar` (global patient search), and `OnShiftCard`
  (the dashboard "who's on shift now" signature element)
- Login / register / change-password flows against the backend auth API
- Dashboard (on-shift snapshot + counters + follow-up queue)
- Ward: male/female day-by-day board and per-case pages (notes, labs, imaging,
  referrals, treatment log, operation form, discharge, generic forms)
- Clinic: new-case form + follow-up queue
- Emergency: recent arrivals + assessment form
- Roster: 8-week board, day-type calendar, shift assignment, Wardyati-style Excel
  import/export with unmatched-review + account creation
- Admin: user management (approvals, rotation import), case-type templates, form
  templates, audit log with filters
- Lab import: PDF upload, test-name mappings, needs-review queue
- Offline queue (IndexedDB) with sync-on-reconnect banner
- `lib/models/types.ts` — TypeScript interfaces mirroring the backend schema.
  **Keep this in sync with `hpb-backend/lib/models/types.ts`.**

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_API_URL` — backend base URL, e.g. `http://localhost:3001`
   - `JWT_SECRET` — must match the backend's `JWT_SECRET`
3. Seed + run the backend first (`npm run seed`, then `npm run dev` on port 3001)
4. `npm run dev` — runs locally at http://localhost:3000
5. Deploy: push to a GitHub repo, import it into Vercel (Hobby/free tier), add the
   same environment variables in the Vercel project settings.
