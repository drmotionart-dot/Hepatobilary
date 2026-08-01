# Phase-5 Report — Shift-Key Gating, Capabilities, Admin Account Creation

## Scope
- Ward shift-key gate (§11.6) applied to six intern-gated writes: clinical-notes POST, lab-panels POST, treatment-logs POST, imaging-requests POST + `[id]` PATCH, referral-consults POST.
- Admin direct account creation (§11.8) and granular capabilities incl. intern profile (§11.7/§11.8). Capability list intentionally locked to `generate-shift-key`.
- Sidebar/nav fixes and GSR/imaging/template UI alignment with spec.

## Features delivered
Backend (`hpb-backend`, commit `b20cf3e`):
- `app/api/shift-key/{current,generate}/route.ts` — current-shift-key fetch (role-gated) + admin-only generate/rotate.
- `app/api/attendance/route.ts`, `app/api/admin/users/[id]/{profile,capabilities}/route.ts`, `app/api/admin/users/route.ts` (POST split + reject-on-password-mismatch).
- `app/api/auth/me/route.ts` — profile + capabilities payload.
- `app/api/day-type-calendar/resolve/route.ts` — day-type resolution wired into daily dashboard logic.
- Gate in `lib/api.ts`: 403 `{error, code}` (`shift-key-missing` / `shift-key-invalid`); sync-replay (`x-sync-replay: true` + `x-performed-at`) accepted and flagged `shiftKeyMatched:false` when the stored key is stale; audit entries carry `shiftKey` / `shiftKeyMatched`.
- Encounters: self-link, admit-spawn, `linkedFollowUpOf`.
- `middleware.ts` CORS fix — allows `x-shift-key`, `x-sync-replay`, `x-performed-at` through preflight.

Frontend (`hpb-app frontend`, commit `14a9ab8`):
- `lib/shift-key-client.ts`, `ShiftKeyProvider/Badge/Card`, prompt-when-required flow, TopBar badge.
- `lib/client-api.ts` rewrite: `safeRefresh`, `isQueuedResponse`, serialized `flushOfflineQueue` (dedupe), boot flush of leftover pending items.
- Admin hub, `UsersManager` + `CreateAccountModal`, `CapabilityManager`, `AttendancePanel`, profile page (Account/Capabilities/Attendance cards).
- Sidebar consolidation into `SidebarNav`, role-based visibility (interns see no Admin link).
- Offline-queued writes skip `router.refresh()`/`push()` to avoid page-destruct (fixed across all five encounter forms + emergency assessment + template fetch `.catch`).

## Verification
- UI walkthrough `qa-phase5.cjs`: **62/62 checks PASS** (final acceptance run, zero page errors across all sessions):
  - A: admin hub, create account, profile page, capability badge, key card + `/api/shift-key/current` match.
  - B: change-password, capability generate, TopBar cached-key badge.
  - C: prompt wrong→right, key rotation, offline queued note replayed, stale-key replay flagged `shiftKeyMatched:false` in audit.
  - D: capability-less intern has no generate button; prompt wrong→right saves.
  - E: resident role-filtered hub (hides template/mapping managers, shows audit) + Shift key audit column.
  - F: regression sweep of /roster, /ward, /clinic, /emergency, /lab-import.
- Cleanup: `cleanup-qa.cjs` removed all QA-created users (30).
- Gates: `npm.cmd run lint` clean (frontend); `npx.cmd tsc --noEmit` clean on both repos.

## Bugs found & fixed during this phase
1. Backend CORS preflight dropped shift headers → gated browser writes died in preflight; fixed in `middleware.ts`.
2. `ShiftKeyBadge` SSR/client mismatch → render nothing until mounted.
3. Offline queued-write `router.refresh()` → full navigation page-destruct; replaced with `safeRefresh` guard.
4. `EmergencyAssessmentForm` / `AddNoteForm` unhandled template-fetch rejections offline → `.catch(() => {})`.
5. Duplicate offline replays (reconnect racing boot flush) → `flushInFlight` serialization.
6. Unflushed pending items from a previous offline session → boot flush in `initOfflineQueue`.

## Commits
- Backend: `b20cf3e` → pushed `main` (`70a2f1d..b20cf3e`).
- Frontend: `14a9ab8` → pushed `main` (`e5e4b25..14a9ab8`).
