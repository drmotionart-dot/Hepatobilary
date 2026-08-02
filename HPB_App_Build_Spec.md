# HPB App Build Specification
> Internal reference — keep up to date as features land.

**For:** Al Miri Hospital, Alexandria — Hepatobiliary Surgery Department
**Purpose:** Documentation, Ward/Clinic/Emergency status tracking, and shift rostering for interns and residents
**Build target:** OpenCode (custom code, free BigPickle model)
**Budget:** $0 — free-tier services only

---

## 1. Goals & Principles

1. Digitize all department paperwork (GSR notes, referrals, lab tracking, imaging requests, treatment logs, discharge forms, operation notes) into one system.
2. Give a live, role-based view of every patient in the Ward, Clinic, and Emergency workflows.
3. Encode the department's actual clinical protocol (age-based ECG/Echo triggers, case-type-driven lab/diet/checklist presets) as *editable data*, not hardcoded logic.
4. Track who is on shift, for every day type, automatically.
5. Work well on mobile and desktop from one codebase, tolerate patchy connectivity, and cost nothing to run at this scale.
6. **Bilingual by design.** Source paperwork mixes English clinical shorthand with Arabic (patient names, some orders, some form labels). The UI must support Arabic text entry and RTL display anywhere a patient name or Arabic order might appear — this is not optional polish, it reflects how the paperwork is actually written.
7. Every audit-relevant action (who entered/edited what, when) is logged. This is a clinical record system — treat data integrity and access control as first-class, not an afterthought.

---

## 2. Tech Stack (all free tier)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) | One codebase serves web + installable PWA for mobile; deploys natively to Vercel |
| Hosting | Vercel (Hobby) | Free, zero-config Next.js deploys; fine for internal, non-commercial departmental use |
| Database | MongoDB Atlas (M0 free cluster) | 512MB free forever, plenty for text-based clinical records |
| Auth | Auth.js (NextAuth) | Free, open-source, handles role-based login natively in Next.js |
| Styling/UI | Tailwind CSS + shadcn/ui | Free, fast to build a polished UI, fully customizable (not locked into a generic template look) |
| File storage (if needed later, e.g. attaching scanned reports) | Vercel Blob free tier (1GB) | No separate vendor needed at this scale |
| Offline queue | Browser IndexedDB (client-side only) | No paid service — local queue of unsynced submissions, flushed to the API when connectivity returns |

No component of this stack requires a credit card or has a hard expiry at your expected usage.

---

## 3. Data Model

All collections live in MongoDB. Every document has `createdAt`, `updatedAt`, `createdBy`, `updatedBy` for audit purposes (omitted below for brevity, but mandatory on every collection).

### 3.1 `User`
```
{
  _id,
  fullName,
  role: "intern" | "resident" | "admin",
  loginId,                      // the ACTUAL login credential, unique, lowercase.
                                // Self-registered: their email. Bulk-generated: "hpb" + phone digits (e.g. hpb01123456789)
                                // or "hpb-" + random suffix when there is no phone/email.
  email: string | null,         // optional; self-registered accounts always have one
  phone: string | null,         // canonical identity key — normalized digits (stripped of spaces/"+20"/"0020").
                                // Unique across users; this is what both imports match on (spec 6.1 / 10.2).
  passwordHash,                 // via Auth.js
  accountType: "self-registered" | "bulk-generated",
  status: "pending-approval" | "active" | "expired" | "removed",
  approvedBy: userId | null,
  approvedAt: date | null,
  mustChangePassword: boolean,  // true on first login until they set their own password
  expiresAt: date | null,       // set for bulk-generated accounts (createdAt + 50 days); null = never expires
  rotationImportId: rotationImportId | null,   // links back to the Excel batch that created this account, if applicable
  tourCompletedAt: date | null, // set once the onboarding tour is completed or dismissed (spec 14)
  grantedCapabilities: [capability] | [],   // optional per-intern capability grants (spec 11.7)
}
```
See section 10 for the full registration/approval/expiry workflow this schema supports.
Registration is the only path that lets the applicant supply a phone (optional).

### 3.2 `Patient`
```
{
  _id,
  medicalNumber: string,      // hospital-assigned, unique
  fullName: string,           // supports Arabic
  sex: "male" | "female",
  age: number,                 // paper forms use age directly, not DOB — mirrored here
}
```
One Patient record persists across all their visits over time — a returning patient is never re-created.

### 3.3 `Encounter`
The central spine — one per episode (an ER visit, a ward admission, a clinic visit).
```
{
  _id,
  patientId,
  type: "emergency" | "ward" | "clinic",
  caseType: "hernia" | "biliary" | "hepatic" | "custom",   // drives templates; "custom" pairs with customCaseTypeLabel below
  customCaseTypeLabel: string | null,   // free-text case name when caseType === "custom", e.g. "Appendicitis" — required for custom cases
  status: "active" | "discharged" | "follow-up-pending" | "closed" | "referred-out",
  ward: "male" | "female" | null,     // set once admitted
  openedAt: date,
  closedAt: date | null,
  openedBy: userId,
  linkedFollowUpOf: encounterId | null   // if this encounter is a follow-up visit to a prior discharge
}
```

### 3.4 `ClinicalNote` (the GSR engine)
One or more per encounter (initial note, consult reviews, follow-up notes all use this same shape).
```
{
  _id,
  encounterId,
  context: "new-case" | "emergency-assessment" | "specialty-consult" | "follow-up",
  authoredBy: userId,
  presentingLine: string,        // "A [age] yo [sex] presented to clinic c/o..."
  pmhx: [ { condition, detail } ],       // structured list, free text per item
  pshx: [ { procedure, date, outcome } ],
  complaint: {
    main: string,
    duration: string,
    associated: [string],
    pertinentNegatives: [string],
    bowelHabit: "normal" | "constipation" | "diarrhea",
    dysuria: boolean,
    viralHepatitis: { hcv: bool, hbv: bool, hiv: bool }
  },
  generalExam: {
    consciousness: "A" | "confused" | "obtunded",   // A,O,C shorthand from GSR
    bp: string, hr: number,
    ecgRequired: boolean,     // auto-true if age > 40, overridable
    ecgDone: boolean,
    echoRequired: boolean,    // auto-true if age > 60, overridable
    echoDone: boolean
  },
  localExam: {
    templateUsed: "hernia" | "biliary" | "hepatic" | "generic",
    fields: { ... }            // dynamic — shape comes from CaseTypeTemplate, see 3.5
  },
  riskFactors: { smoker: boolean, ... },   // dynamic per template
  investigationsOrdered: [string],
  recommendation: string,
  treatmentOrders: [string]     // meds ordered at time of this note
}
```

### 3.5 `CaseTypeTemplate` (the editable-template engine)
This is what makes the LE checklist, lab presets, and diet instructions configurable without touching code.
```
{
  _id,
  name: "Hernia" | "Biliary" | "Hepatic" | ...,   // extensible — admin can add more
  leChecklist: [ { fieldKey, label, type: "text"|"boolean"|"select", options? } ],
  riskFactorChecklist: [ { fieldKey, label } ],
  labPanelPreset: [testKey, testKey, ...],          // references LabTestCatalog
  dietInstruction: string,
  active: boolean
}
```
- Seeded at build time with Hernia, Biliary, Hepatic (specs in section 5).
- An admin screen lets a user with the right to manage templates edit any of these fields live (resident + admin, spec 7).
- `ClinicalNote.localExam.fields` stores the **answers** at time of entry — changing a template later never rewrites old notes.

### 3.6 `LabPanel` (per encounter, matches the paper Lab Investigation sheet exactly)
```
{
  _id,
  encounterId,
  results: [
    {
      date: date,
      category: "CBC" | "RFTs" | "Electrolytes" | "LiverFTs" | "Coagulation" |
                "CardiacE" | "Virology" | "Thyroid" | "SepsisP" | "Others",
      test: string,      // e.g. "HGB", "Urea", "PT"
      value: string
    }
  ]
}
```
Rendered back to the UI as the same date-columns-by-test-rows grid as the paper form. Auto-seeded with the relevant `labPanelPreset` tests (empty, awaiting values) the moment a `caseType` is chosen — editable/addable afterward, per your decision.

### 3.7 `ImagingRequest`
Mirrors the official University of Alexandria form.
```
{
  _id,
  encounterId,
  modality: "CT" | "US" | "Doppler" | "MRI" | "X-ray" | "Mammography",
  modalityDetail: string,          // e.g. "CT Triphasic Abdomen & Chest"
  clinicalDiagnosis: string,
  pertinentClinicalData: string,
  partToBeExamined: string,
  aimOfExamination: string,
  requestedBy: userId,
  requestedAt: date,
  status: "requested" | "scheduled" | "resulted",
  appointment: { date, time, instructions } | null,
  result: string | null,           // attached once back from radiology
  resultAttachedAt: date | null
}
```

### 3.8 `ReferralConsult`
Covers both the initial referral slip and the specialist's eventual GSR-style review.
```
{
  _id,
  encounterId,
  toSpecialty: string,
  reason: string,
  referredBy: userId,
  referredAt: date,
  status: "pending" | "reviewed",
  reviewNoteId: clinicalNoteId | null   // links to the specialist's ClinicalNote (context: "specialty-consult")
}
```

### 3.9 `TreatmentLog` (daily progress/orders — the running ward log)
```
{
  _id,
  encounterId,
  entries: [
    { date, treatment: string, otherRecommendations: string, physician: userId }
  ]
}
```
Append-only from the UI's perspective — new entries add to the array, old ones are never edited (matches the paper's "one row per day" pattern and preserves a real audit trail).

### 3.10 `OperationForm`
No paper example was provided for this yet — the fields below are a reasonable draft based on standard operative note structure and the format conventions seen on your other official papers (patient banner: Patient No. / Name / Department / Room / Date), flagged for your review against the department's actual paper before build:
```
{
  _id,
  encounterId,
  patientNo: string,          // matches Patient.medicalNumber — mirrors your papers' banner field
  procedureName: string,
  preOpDiagnosis: string,
  postOpDiagnosis: string,
  surgeon: userId,
  assistants: [userId],
  anesthesiaType: string,
  anesthetist: userId | string,
  findings: string,
  procedureDetails: string,
  specimensSent: [string],       // e.g. "gallbladder for histopathology" — links conceptually to Reports/results
  estimatedBloodLoss: string,
  complications: string,
  postOpPlan: string,            // feeds the first TreatmentLog entry after surgery
  date: date
}
```
**Flag:** please send the actual operation form paper when you can — I'll correct this schema to match exactly, the same way I did for GSR/labs/imaging.

### 3.11 `DischargeForm`
```
{
  _id,
  encounterId,
  dischargeDate: date,
  summary: string,
  followUpRequired: boolean,
  followUpInstructions: string | null,
  dischargedBy: userId
}
```
Setting `followUpRequired: true` sets the parent `Encounter.status` to `follow-up-pending` instead of `closed` — the case stays visible in a filtered "pending follow-up" list until someone closes it.

### 3.12 `FormTemplate` (generic — the "add any other paper" requirement)
For any paper not yet covered by a dedicated collection above (one-off or saved-to-system reusable forms).
```
{
  _id,
  name: string,
  fields: [ { fieldKey, label, type, options? } ],
  savedToSystem: boolean,   // false = one-time use, true = appears in the reusable form library
  createdBy: userId
}
```
Filled instances of these live in a generic `FormRecord` collection linked to an `encounterId`, storing whatever `fields` the template defines.

### 3.13a `LabImport` / `LabTestNameMapping` (batch PDF auto-import)

The hospital lab returns results as a structured PDF (per-category pages: Coagulation, Chemistry, Complete Blood Picture — each with Lab No., Patient Code, Name, Age, Request Date, Branch, Location, Sample Type, and a Test/Result/Unit/Ref-Range table). Rather than re-typing these, the app parses the PDF directly.

**`LabTestNameMapping`** (editable, same philosophy as `CaseTypeTemplate`)
```
{ _id, externalTestName: string, internalTestKey: string, category: string }
```
Seeded from the sample PDF (e.g. "SGPT (ALT)" → "ALT" / LiverFTs, "Blood Urea" → "Urea" / RFTs, "Sodium (Na)" → "Sodium" / Electrolytes, "#Haemoglobin" → "HGB" / CBC, etc.). Grows over time as new/unrecognized test names are mapped once by an admin.

**`LabImport`** (one per uploaded PDF)
```
{
  _id,
  sourceFileName: string,
  patientCode: string,          // from the PDF header — the lab system's own code
  matchedPatientId: patientId | null,
  matchedEncounterId: encounterId | null,
  requestDate: date,
  extractedTests: [ { externalTestName, result, unit, refRange, category } ],
  status: "matched" | "needs-review",
  importedBy: userId,
  importedAt: date
}
```

**Flow (batch-capable):**
1. Upload one or more PDFs at once (drag a whole folder/selection in) → each file is parsed independently server-side (no OCR needed — these are text-based PDFs), pulling the header block + every Test/Result row per page of that file.
2. Each file's `Patient Code` is matched **independently** against known patients — one upload batch naturally resolves to many different patients, each finding its own record. No PDF's outcome depends on any other's. Matching is always by the numeric **Patient Code**, never by the Arabic name text, which frequently comes out reversed/garbled on PDF text extraction and should only be used as a human-readable display check.
3. Each extracted test name is looked up in `LabTestNameMapping`; recognized ones auto-fill the matching patient's `LabPanel` under the Request Date column. Unrecognized names are queued for a one-time admin mapping, then apply automatically on future imports (including retroactively re-checking anything left in "needs review").
4. If a file's `patientCode` doesn't match any known `Patient`, that single file lands in a "needs review" queue — it doesn't block or fail the rest of the batch.
5. After a batch finishes, show a short results summary: X matched and filled automatically, Y needs manual review (with reasons — unmatched code, unrecognized test names, etc.).
6. **Confirmed:** the lab PDF's "Patient Code" is the **same** as the department's medical number field (clinic and ward both use it) — matching is done directly against `Patient.medicalNumber`, so there is **no separate `labPatientCode` field** on the `Patient` record and no extra input in the UI. No change to note 2 above: matching is still by the numeric code, never by the Arabic name.
7. Source PDFs are not retained long-term after import — only the extracted structured results persist in `LabPanel`, keeping storage lean (per your note about not wanting the PDFs themselves to pile up).

### 3.13 Shift Rostering

**`DayTypeCalendar`**
```
{ _id, date, dayType: "normal" | "clinic" | "emergency", surgeryOverlay: boolean }
```
Thursdays default to `clinic`, Sundays/Wednesdays default to `normal` + `surgeryOverlay: true`, everything else defaults to `normal`. Emergency is always set manually by an admin — this collection is the source of truth once set.

**`RoleSlotDefinition`** (the rulebook — seeded once, rarely changed)
```
{ _id, dayType, personType: "intern"|"resident", shiftType: "long"|"night"|"24hr"|"surgery-partial", category: "ward"|"clinic"|"emergency-route"|"typing"|"none", label, weekdays?: [number] }
```
Encodes every row of the shift tables from section 6.

**`ShiftAssignment`**
```
{
  _id,
  date,                             // stored at local midnight
  roleSlotDefinitionId,
  userIds: [userId],                // a slot holds a group (Emergency Long → Route / Ward / Typing is 3 people)
  startTime?, endTime?,             // used for the partial surgery-list slot
  absent: [                         // per-person absence entries (spec 6.2); empty unless someone was marked absent
    { userId, absentReason: string, absentMarkedBy: userId, absentMarkedAt: date }
  ]
}
```

---

## 4. Workflows

### 4.1 Emergency
1. Patient arrives → intern logs a new `Encounter (type: emergency)` + `ClinicalNote (context: emergency-assessment)`.
2. Decision branch:
   - **Referred out** → `Encounter.status = "referred-out"`, reason logged, encounter closes here.
   - **Admitted for surgery** → spawns/updates the `Encounter` to link into `ward`, triggers `ReferralConsult` entries for required specialty reviews (e.g. anesthesia), each tracked pending → reviewed.
3. Once anesthesia/specialty clearance is in, case proceeds to surgery scheduling.

### 4.2 Ward
1. Every admitted patient's `Encounter (type: ward)` shows on the Ward view, split Male/Female, by day.
2. Each day: vitals, `LabPanel` entries, `ReferralConsult` status, `ImagingRequest` status, `TreatmentLog` entries, and `OperationForm` (if surgery done) are all visible on the patient's page.
3. On the scheduled OR day (Sunday/Wednesday per the surgery list), the `OperationForm` is completed.
4. At discharge: `DischargeForm` filled → if `followUpRequired`, encounter stays open under `follow-up-pending` and appears in a dedicated follow-up queue until manually closed at the follow-up visit.

### 4.3 Clinic (Thursdays)
1. New case → intern takes history, fills `ClinicalNote (context: new-case)`, picks `caseType` → LE checklist, lab preset, and diet instruction auto-populate per section 5.
2. Age triggers (ECG >40, Echo >60) auto-flag; smoker flag auto-adds respiratory session orders.
3. Decision: admit (spawns `Encounter (type: ward)` linked to the same patient) or not.
4. Follow-up cases: pull up the patient's prior `Encounter`/`DischargeForm`, log a new `ClinicalNote (context: follow-up)` against it.
5. Any urgent finding during clinic → protocol note says these get expedited to ER same-day; the encounter's `type` can be escalated to `emergency` without re-entering patient data.

---

## 5. Case-Type Templates (seed data)

### Hernia
- **LE checklist:** pain site/radiation, reducibility (yes/no), tender (y/n), site, size, deep ring test, scrotal neck test, oozing (y/n)
- **Risk factors:** smoking, dysuria, constipation, heavy lifting, general straining
- **Lab panel:** CBC, Urea, Creatinine, Na, K, PT, PTT, INR
- **Diet:** Normal diet

### Biliary
- **LE checklist:** pain site/radiation, tenderness, site, Murphy's sign
- **Lab panel:** CBC, Urea, Creatinine, Na, K, PT, PTT, INR, Albumin, Total & Direct Bilirubin, Alkaline Phosphatase
- **Diet:** Fat-free, dairy-free

### Hepatic
- **LE checklist:** jaundice (present/absent, degree), ascites (present/absent, degree), hepatomegaly (present/absent, size), splenomegaly (present/absent, size), spider naevi, palmar erythema, encephalopathy grade (None–IV), asterixis, caput medusae, lower limb edema, abdominal tenderness/site
- **Risk factors / history:** alcohol use, viral hepatitis status, prior decompensation episodes, prior endoscopy/varices history
- **Lab panel:** CBC, Urea, Creatinine, Na, K, PT, PTT, INR, Liver FTs (ALT, AST, T.Protein, S.Albumin, Bilirubin T/D), Virology (HBsAg, HCVAb)
- **Diet:** free text (case-dependent — sodium restriction if ascites, etc.)

### Universal rules (apply to every case type)
- Age > 40 → ECG required (editable)
- Age > 60 → Echo required (editable)
- Smoker → auto-add Atrovent + Pulmicort to orders
- Every complaint must capture: bowel habit, dysuria, viral hepatitis status

All of the above are stored in `CaseTypeTemplate` documents, editable from an admin screen — not hardcoded.

---

## 6. Shift Rostering Rules (seed data for `RoleSlotDefinition`)

**Interns**
| Day type | Long shift | Night shift |
|---|---|---|
| Normal | 1× Long intern | 1× Night intern |
| Clinic (Thu) | 1× Long intern + 1× Clinic intern | 1× Night intern |
| Emergency | Long emergency intern → Route / Ward / Typing (3 people) | Night emergency intern → Route / Ward / Typing (3 people) |

**Residents** (24hr shifts)
| Day type | Slots |
|---|---|
| Normal | Ward resident |
| Normal + Sun/Wed | Ward resident + Surgery-list resident (partial hours within the Long window) |
| Clinic (Thu) | Ward resident + Clinic resident |
| Emergency | Ward resident + Emergency-route resident |

The "who's on today" screen resolves `DayTypeCalendar` for the selected date, pulls matching `ShiftAssignment`s, and highlights whichever shift (Long/Night) is currently active based on the clock. Each 24-hour shift runs 08:00 → 08:00 and is split into the **Long shift (08:00–20:00)** and the **Night shift (20:00–08:00)**; the dashboard clock shows the live AM/PM time plus the active half. All shift/roster/day-type dates are keyed in the **department timezone** (`DEPARTMENT_TZ`, default `Africa/Cairo`) — never the server's UTC — so the 08:00/20:00 boundaries match the hospital's wall clock.

### 6.1 Long-range roster pre-fill (Wardyati-inspired)
Rather than filling shifts day by day as they approach, the roster should be plannable far ahead — up to 8 weeks, matching how وردياتي (Wardyati) works for intern doctor scheduling in Egyptian hospitals (a coordinator generates the full shift structure ahead of time, then names get filled or self-booked into open slots).

- **Bulk-generate action:** given a date range (e.g. the next 8 weeks), the system walks every date, resolves its `DayTypeCalendar` (defaulting Thursdays → clinic, Sun/Wed → normal+surgeryOverlay, else → normal, unless already manually overridden), and creates one empty `ShiftAssignment` per applicable `RoleSlotDefinition` for that day. The result is the *entire skeleton* of the next 8 weeks' shifts — every day and every subcategory (Long/Night, Route/Ward/Typing, Clinic, Surgery-list) already laid out and identified, just waiting for names.
- **Filling:** a resident/admin can fill slots individually, or (as a later enhancement, matching Wardyati's distribution modes) allow self-booking — interns/residents claim open slots themselves within rules (manual assignment, free-for-all booking, or auto-equalized distribution). Not required for launch, but the schema (`ShiftAssignment` as discrete slot documents) supports adding this later without a redesign.
- **Excel import (Wardyati format):** a resident/admin uploads a roster spreadsheet — one row per day, one column per shift slot, cells holding `name + phone` bulleted entries. The importer resolves each person against `User` by **phone first, then name** (phone is the canonical identity key, spec 3.1), binds them into the matching `ShiftAssignment` slot (or the emergency duty pool for emergency days), and writes a `RotationImport` / audit record. The same upload also creates accounts for unmatched names that have a phone (spec 10.2 account generation reused) — generated `loginId` + password shown in the UI; phones that already have an account are never duplicated, so re-importing the same roster matches everyone automatically.
- **Excel export:** an "export roster to Excel" action (free library like SheetJS, already free-tier-compatible) for anyone who wants a printable/offline copy — the same convenience Wardyati offers.
- Every generate/fill/edit action on the roster is captured in `AuditLog` per section 7.1.

### 6.2 Marking an intern absent
A resident or admin can mark an intern assigned to a **future or current (mid-shift)** shift slot as absent.

- **Data recorded:** `absentReason` (free text, **required** — e.g. "sick", "family emergency", "exam"), `absentMarkedBy` (the resident/admin who marked it), `absentMarkedAt` (timestamp). All are written as a per-person entry on the `ShiftAssignment` row (spec 3.13).
- **Effects:**
  - The intern **stays in the slot's assignment** — their name is NOT removed; the record shows they were assigned but absent, with the reason.
  - Their name renders **struck-through with an "Absent" badge** and the reason, on the roster and on the dashboard "on shift" card.
  - An **attendance** record is written for that intern for that shift date with `status: "absent"` and the reason as the note (spec 11.8), **unless** an explicit manual `present` attendance record already exists for that date — a manually-confirmed-present day is never overwritten.
- **Un-marking:** a resident/admin can clear the absent flag. Clearing it does **not** delete the attendance record (a separate manual attendance correction can).
- Works for future shifts and the current (mid-shift) day.

---

## 7. Roles & Permissions

| Action | Intern | Resident | Admin |
|---|---|---|---|
| Create/edit clinical notes, vitals, labs | ✅ | ✅ | ✅ |
| Fill forms (GSR, imaging requests, referrals) | ✅ | ✅ | ✅ |
| Finalize discharge | ❌ | ✅ | — |
| Approve/close follow-ups | ❌ | ✅ | — |
| Complete/edit operation form | ❌ | ✅ | — |
| Manage user accounts (approve, create, remove, capability grants) | ❌ | ❌ | ✅ |
| Manage `CaseTypeTemplate` / `FormTemplate` library | ❌ | ✅ | ✅ |
| Manage lab test name mappings | ❌ | ✅ | ✅ |
| Set `DayTypeCalendar` (mark Emergency days) | ❌ | ✅ | ✅ |
| Fill/edit shift roster (`ShiftAssignment`) | ❌ | ✅ | ✅ |
| Mark an intern absent (spec 6.2) | ❌ | ✅ | ✅ |
| Import / export the rotation roster (spec 6.1 / 10.2) | ❌ | ✅ | ✅ |
| View the Round Interns directory (spec 11.8) | ❌ | ✅ | ✅ |
| View intern profile + attendance + roster history | ❌ | ✅ | ✅ |
| View audit log | ❌ | ✅ | ✅ |

Residents get an **Admin-equivalent panel** covering everything operational — case-type templates, form templates, lab test mappings, the calendar/roster, the audit log, and the Round Interns directory. Account management (approving/creating/removing accounts, granting capabilities) stays **admin-only**. Since residents now hold that power directly, the audit log below is the accountability mechanism: every change is attributed and visible, not just trusted. Admins additionally hold full clinical write rights (open cases, document patients) as a management/backstop capability — they are never shift-key gated, and only interns are prompted for the ward key.

### 7.1 `AuditLog`
```
{
  _id,
  collection: string,        // e.g. "ShiftAssignment", "DayTypeCalendar", "Encounter"
  documentId,
  action: "create" | "update" | "delete",
  summary: string,           // human-readable, e.g. "Set 12 Aug 2026 to Emergency day"
  performedBy: userId,
  performedAt: date
}
```
Logged automatically on every write to `ShiftAssignment`, `DayTypeCalendar`, `RoleSlotDefinition`, `CaseTypeTemplate`, and all clinical collections (`Encounter`, `ClinicalNote`, `DischargeForm`, etc.). A dedicated **Audit Log screen** (visible to Resident + Admin) shows a filterable, chronological feed — by user, by date range, by collection — so any change to the roster, calendar, or a patient record is traceable to exactly who made it and when.

---

## 8. UI/UX Direction — Design Tokens

Goal: this should feel like a clean, modern clinical tool a hospital would be proud to show off — not a spreadsheet with a login page. Below is the concrete token system used to build it, so every screen stays visually consistent.

**Color**
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F6F7F5` | Base background — soft, warm neutral, not sterile white |
| `--surface` | `#FFFFFF` | Cards, panels |
| `--ink` | `#1C2321` | Primary text |
| `--primary` | `#0E5C56` | Deep teal — brand, primary actions, nav |
| `--primary-ink` | `#0A403C` | Hover/pressed state of primary |
| `--male-accent` | `#3B5BA5` | Male ward identifier (muted slate blue, not baby-blue) |
| `--female-accent` | `#B15C6B` | Female ward identifier (muted dusty rose, not baby-pink) |
| `--urgent` | `#C4472B` | Reserved strictly for real clinical urgency (overdue labs, urgent imaging pending, emergency flags) |
| `--pending` | `#D98E3B` | Reserved for "awaiting action" states (pending consult, unreviewed import) |
| `--success` | `#3E8F6B` | Confirmed/saved/resolved states |

**Type**
- Display/headings: **IBM Plex Sans** (Latin) paired with **IBM Plex Sans Arabic** (same type family across both scripts — free, professional, and avoids the mismatched-font problem bilingual medical apps often have)
- Body: same family, regular weight
- Data/numeric (lab values, dates, medical numbers): **IBM Plex Mono** — gives the lab grid and roster tables a precise, tabular read, deliberately distinct from prose text

**Layout**
- Persistent sidebar on desktop (Dashboard / Ward / Clinic / Emergency / Roster / Admin), bottom tab bar on mobile — five destinations max, thumb-reachable
- Ward view: two clearly separated columns or toggle (Male/Female, using their accent colors as a quiet identifier — a left border or small dot, never a full colored background), each patient as a card showing medical number, name, day-of-stay, and status-dot (labs pending, imaging pending, ready for discharge). Day-by-day is a horizontal date scroller at the top, not a dropdown.
- Clinical note entry: the case-type picker comes first and visibly changes the form beneath it (a subtle transition, not a jarring reload)
- Lab grid: rendered exactly like the paper — categories as row groups, dates as columns, values in the monospace data font
- Forms generally: large tap targets, inline validation (not error walls), autosave with a small persistent "saved" indicator rather than an explicit save button wherever safe to do so

**Signature element**
The **"who's on shift now"** card — a single glanceable card at the top of the dashboard, always visible without navigating, showing the currently active shift with a subtle live pulse on whoever's on right now. This is the one place worth a small deliberate animation (a gentle pulse, not a flashy effect) — it's the piece of the app people will check first, every single day.

**RTL/Arabic:** name fields and any Arabic-language order text render correctly right-to-left inline within an otherwise LTR layout — needs real testing with actual Arabic patient names, not just a language toggle.

**Offline indicator:** a small, honest, unobtrusive banner when a submission is queued locally rather than confirmed saved — never let a user wonder if data actually went through.

**Accessibility floor:** responsive down to mobile, visible keyboard focus states, reduced-motion respected for the signature pulse and any transitions.

---

## 9. Build Order for OpenCode

1. **Foundation:** Next.js project scaffold, MongoDB Atlas connection, Auth.js with role-based sessions, base layout (sidebar/mobile nav) — deploy a "hello world" to Vercel early to confirm the pipeline works end to end.
2. **Core models:** `User` (with the full registration/approval/expiry fields), `Patient`, `Encounter` — basic CRUD, role-gated. Build the **registration flow** here too (self-register + approval queue, rotation Excel template download/upload/regenerate, 50-day expiry check) — everything downstream needs real accounts to log in as.
3. **CaseTypeTemplate engine + seed data** (Hernia, Biliary, Hepatic) — build this before the clinical note UI so the note form has something real to render against.
4. **ClinicalNote** form (dynamic LE checklist, age-based auto-flags, smoker auto-orders).
5. **LabPanel** — auto-seeded from case type, editable grid UI matching the paper layout; add **LabImport** (PDF parsing + Patient Code matching + `LabTestNameMapping`) right after the manual grid works, so both entry paths feed the same data.
6. **Ward module** — Male/Female day-by-day view, pulling all of the above together per patient.
7. **ImagingRequest + ReferralConsult** — request/result pairs.
8. **TreatmentLog** — daily append-only entries.
9. **Clinic module** — new-case entry + follow-up queue, admit-to-ward action.
10. **Emergency module** — assessment entry, refer-out vs admit branch.
11. **DischargeForm** + follow-up-pending status logic.
12. **OperationForm** — build against your actual paper once sent; draft schema above as placeholder.
13. **Shift rostering** — `DayTypeCalendar` admin screen, `RoleSlotDefinition` seed data, `ShiftAssignment` entry screen, "who's on today" dashboard card, bulk generation, Wardyati Excel import/export, mark-intern-absent (spec 6.2).
14. **Generic FormTemplate/FormRecord engine** — for anything not covered by a dedicated collection.
15. **Offline queue** — IndexedDB-backed submission queue with sync-on-reconnect.
16. **Polish pass** — UI/UX direction from section 8 applied consistently, empty states, loading states, error states.

---

## 10. User Registration & Account Lifecycle

Two separate ways an account can come into existence, with different rules for each.

### 10.1 Self-registration (needs approval)
1. Someone fills a "Request access" form (name, email, number, role requested) → creates a `User` with `status: "pending-approval"`, `accountType: "self-registered"`.
2. A **Pending approvals** queue is visible to Admin — they see the request, and approve or reject. (Account management is admin-only, spec 7.)
3. On approval: `status → "active"`, `approvedBy`/`approvedAt` set, `expiresAt` stays `null`.
4. **This account never expires on its own.** It stays active indefinitely until an admin explicitly removes it (`status → "removed"`) — i.e. "kicked."
5. Every approval and removal is captured in `AuditLog` (section 7.1) — who approved whom, who removed whom, and when.

### 10.2 Rotation bulk-import (Excel round-trip)
For onboarding a whole rotation of interns at once, rather than one-by-one self-registration:

1. **Download template** — a button generates a blank `.xlsx` with columns: `Name | Email | Number`. Available to Resident + Admin.
2. Resident/Admin fills it offline with everyone in the current rotation, then **uploads** it back (also Resident + Admin).
3. Server parses each row and, per row:
   - **Phone is the identity key (spec 3.1).** If a row's `number` (or email, as fallback) already matches an existing `User`, the row is reported as **existing** and no duplicate is created — a person only ever has one account no matter how many rotations they pass through.
   - Otherwise creates a `User` with `role: "intern"`, `accountType: "bulk-generated"`, `status: "active"`, `mustChangePassword: true`, `phone` set to the normalized row number.
   - Generates the **login ID** and a random temporary password. Login ID is `hpb` + normalized phone digits (e.g. `hpb01123456789`); `hpb` + 6 random chars when there is no phone.
   - Sets `expiresAt = uploadedAt + 50 days`.
   - Links the account to a `RotationImport` record (below) via `rotationImportId`.
4. **Import result** — the upload response includes the generated `loginId` and `password` per created row, ready to hand out to the rotation (the admin UI prints them inline).
5. **First login** forces a password change (`mustChangePassword`) before they can do anything else — once changed, that flag clears, but `expiresAt` is untouched; bulk-generated accounts still expire at 50 days regardless of whether the password was changed.
6. **Expiry:** once `expiresAt` passes, `status → "expired"` automatically (checked at login, or via a lightweight scheduled check) — login is blocked. A new rotation import naturally supersedes it; no manual cleanup needed.

**`RotationImport`**
```
{
  _id,
  uploadedBy: userId,
  uploadedAt: date,
  sourceFileName: string,
  rows: [
    { name, email?: string, number?: string, generatedUserId, generatedLoginId, generatedPassword?,
      status: "created" | "existing" | "error", errorReason?: string }
  ]
}
```

### 10.3 Summary of lifecycle rules
| Account origin | Requires approval? | Expires? |
|---|---|---|
| Self-registered | Yes (Admin) | Never — lasts until manually removed |
| Rotation bulk-import (Excel) | No — active immediately | Yes — 50 days from creation |

---

## 11. Capabilities, Intern Profiles & the Round Interns Directory

Most interns use the app with only their base role permissions. Two extras exist on top of the role system: per-intern capability grants, and the intern-facing review records. This section defines both (spec §11.7 and §11.8).

### 11.1 Capability model
`grantedCapabilities` on the `User` (spec 3.1) is an opt-in array of named capabilities an admin grants to a specific intern. A capability extends what that intern may do beyond their role's default row in the matrix (spec 7). The known capability names:

- `bypass-shift-key` — lets an intern submit ward/clinic/emergency forms **without** entering the current shift key (normally interns are prompted for it).
- `manage-roster` — lets an intern generate/fill/edit shift assignments the way residents do.
- `finalize-discharge` — lets an intern complete a discharge form.
- `complete-operation-form` — lets an intern complete/edit an operation form.
- `approve-followups` — lets an intern approve/close follow-up cases.
- Additional clinical or form-related capabilities can be added without schema changes.

### 11.2 Granting & revoking
Capabilities are granted/revoked per intern by an **admin** from the intern's profile (the full desired set is sent on each save — set semantics, not per-capability toggles). Every change is written to `AuditLog` with the before/after set (section 7.1).

### 11.3 Immediate effect
Capability grants take effect **immediately** — the current session is re-validated against the database on each request (e.g. `/api/auth/me` reads the user fresh from the DB), so an intern does not need to log out and back in after a grant or revocation.

### 11.4 Guarding
Every write endpoint checks the caller's role **and** capability (where a capability applies) and returns 403 when missing. The UI hides actions the caller can't perform rather than showing them and failing.

### 11.5 Shift key gating
Interns (and only interns) are prompted for the current shift key before submitting ward/clinic/emergency forms, unless they hold `bypass-shift-key`. Residents and admins are never prompted (spec 7).

### 11.6 Attendance record
Attendance is tracked per intern per shift date: `present`, `absent` (with reason — written automatically when a resident/admin marks them absent per spec 6.2), or `late`/unexcused variants as the department defines. A manual `present` record for a date is authoritative and is never overwritten by an absent-mark.

### 11.7 Intern profile
Every intern's profile page shows: full account data, complete **roster/shift history** (each date, the slot label, the resolved day type, shift time, and any absence entry), the **attendance record** (including marked-absent entries with reasons), and the intern's own **audit-log entries**. Resident + Admin can open any intern's profile.

### 11.8 Round Interns directory
A **Round Interns** directory lists every active intern (`role: "intern"`, `status: "active"` — self-registered and bulk-imported alike), sorted by name, each row linking to the intern's profile (spec 11.7). Resident + Admin. It is also the home of the rotation Excel import (spec 6.1 / 10.2) for residents, keeping account-management screens admin-only.

---

## 12. Shift Key & Capability-Gated Features

The ward key concept is a lightweight per-shift passcode that gates intern form submissions (spec 11.5):

- The **ShiftKeyProvider** holds the current shift key client-side; the dashboard's Shift Key card shows today's key to whoever is on shift and lets an intern with `bypass-shift-key` proceed without it.
- Interns who don't hold `bypass-shift-key` must enter the key shown by the on-duty resident before a ward/clinic/emergency submission is accepted.
- Residents and admins never see the prompt; their role supersedes the key.
- The key rotates with the active shift (the 08:00 boundary, spec 6).
- Capability checks are enforced server-side on the write endpoints, independent of what the UI shows (spec 11.4).

---

## 13. Offline-First Behavior

The app must tolerate patchy connectivity (spec 1.5, 2):

- **IndexedDB submission queue:** writes issued while offline are queued locally with the request body; the queue flushes to the API when connectivity returns, in order.
- **Reads and auth are never queued:** session checks, lookups and data reads fail fast with a clear offline state rather than being silently buffered.
- **Offline banner:** a small persistent banner shows while something is queued locally vs. confirmed saved (spec 8), so a user never wonders whether their data actually went through.
- **Service worker + PWA:** the app installs as a PWA and serves its shell from the local service worker; the roster, dashboard and form screens work from cache where safe.
- **Content that must always be available offline** (e.g. the onboarding tour steps, spec 14) is bundled in the app, not fetched at runtime.

---

## 14. Onboarding Tour

On **first login**, the app opens a guided onboarding tour instead of leaving the user to figure out the UI alone. The tour is role-aware, navigates the real pages, and can be relaunched any time.

### 14.1 What it is
- **Three tours**, one per role — Intern, Resident, Admin — each walking the screens that matter for that role (Intern: dashboard → shift key → search → ward → clinic → emergency → lab import → follow-up queue; Resident: shift-key generation, roster bulk-generate / day-type calendar / Wardyati import / mark-absent, discharge + operation forms + referral review, Round Interns, audit log; Admin: the resident core plus user approvals, account creation, capability grants, case-type templates, form templates, lab mappings, audit log).
- **Capability-aware:** an intern who holds `bypass-shift-key` sees wording that says they can submit without the key; one who doesn't is told to use the key shown on the dashboard. Extra steps are inserted when the intern holds additional capabilities.
- **Navigates the real app:** each step points at an actual element on a real page and moves the user there (`router` navigation + a spotlight on the target, with a fallback centered card when the step targets something inside an encounter form).

### 14.2 Offline-capable
The tour's step content is **bundled in the app** — no runtime fetch — so it works on first load with no connectivity. A single lightweight session read (`/api/auth/me`) supplies `role`, `grantedCapabilities` and `tourCompletedAt`; if that call fails, a small cached copy of the profile is used.

### 14.3 Completion & relaunch
- Finishing or skipping the tour writes `tourCompletedAt` on the `User` (spec 3.1) and sets a local flag, so it does not auto-open again.
- A persistent **"Tour guide"** button in the top bar relaunches the tour at any time for the signed-in user's role.
- **Skip** is always available at every step; skipping marks the tour complete so it never nags.

---

## 15. Open Items (need your input before or during build)

- Operation form — actual paper needed to replace the draft schema in 3.10.
- Hepatic diet instruction — left free-text; let me know if there's a fixed protocol.
- Any additional case types beyond Hernia/Biliary/Hepatic planned for the near term (Appendix, Trauma, etc.) — not required for launch, but good to know if `CaseTypeTemplate` needs anything beyond what's designed.
- Confirm whether self-booking should be enabled for interns at launch, or remain a resident/admin-only fill workflow for now (schema supports it either way, spec 6.1).
- Confirm the exact capability list for interns (spec 11.1) — which capabilities beyond `bypass-shift-key` should be granted by default, if any.

---

## 16. Engineering Maturity (CI/CD, Architecture & Testing)

The app must be maintainable beyond launch. This section pins the engineering-maturity baseline that applies to **both** the frontend and the backend repository.

### 16.1 Layered backend architecture
- **Routes stay thin:** an API route parses + authorizes, calls a service, and responds. Business rules live in `lib/services/*`, persistence in `lib/repositories/*`, and shared error plumbing in `lib/http.ts` (`HttpError`, `jsonError`, `handleRoute`).
- **Single source of truth per rule:** day-type resolution (`lib/day-type.ts`) and slot applicability feed every resolver — bulk-generate, self-book, roster board, export, import and the dashboard all agree.
- **Auth stays in routes:** guards (`requireRole`, `requireCapability`) return explicit 401/403 before any service call; services never trust the caller.
- **Pure helpers are importable without a DB:** sheet parsing, phone/name normalization and date math live in leaf modules so they can be unit-tested in isolation.

### 16.2 Automated tests
- **Unit tests** cover the rulebook: shift boundary (`dayRange`, `activeShiftDate`), day-type defaults (Thursday→clinic, Sun/Wed→normal+surgery), and roster-import parsing (phone/name normalization, date parsing, header detection, column mapping, slot matching).
- **Integration tests** run the service layer against a real MongoDB via `mongodb-memory-server` — assignment, bulk-generate idempotency, absence mirroring into attendance, self-booking rules (8-week window, one slot per day, 409 conflicts), board/today/export, the Wardyati import + review queue, and account creation. They never touch the real database.
- **CI runs them:** `npm run test --if-present` executes the suite on every push/PR; tests must stay green alongside typecheck, lint and build.

### 16.3 CI/CD
- **GitHub Actions CI** on every push/PR to `main`: Node 20, `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npm run test`. CI uses isolated dummy secrets; real credentials stay in each environment's `.env.local`.
- **Dependabot** checks npm dependencies weekly (max 10 open PRs, labeled `dependencies`) so the pile never goes stale.
- **Branch protection** on `main`: CI must pass before merge.

### 16.4 Security & operational baseline
- Secrets live only in `.env.local` (git-ignored) and in the hosting platform's env vars — never in code or CI logs.
- Audit logging (`lib/audit.ts`) records who changed what (shift assignments, day types, roster imports, account creation) with `performedBy`/`performedAt`.
- Structured, request-scoped logging with a correlation ID is in place: every API request carries an `x-correlation-id` (frontend → middleware → `handleRoute`), is returned on the response, and is logged as JSON lines so a failing request is traceable end-to-end.
- Ops surfaces: an unauthenticated `GET /api/health` (liveness + DB reachability), a dependency-free `npm run load-test` (p50/p95/p99 + error rate, exits non-zero on budget breach), and `docs/RUNBOOK.md` for rollback/triage/seed-restore.
- Rollback = `git revert` on the offending commit(s); the DB schema is append-safe (no destructive migrations), and a wiped test/QA database is only ever seeded with the canonical seed (`scripts/seed.ts`).

### 16.5 Test-data hygiene
- Any QA/verification data written to a real environment is wiped afterward; the canonical state is exactly the seed data plus the real admin account.
- Integration tests never touch real environments — they run entirely inside `mongodb-memory-server`.
