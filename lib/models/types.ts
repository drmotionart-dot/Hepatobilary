// Type definitions mirroring section 3 of HPB_App_Build_Spec.md.
// Keep this file in sync with the spec — it's the single source of truth
// for what a document in each collection looks like.

// The frontend never constructs ObjectIds — every write happens in the
// backend API — so a structural stand-in suffices for typing documents
// that arrive as JSON (where _id serializes to a string).
export type ObjectId = {
  toString(): string;
  toHexString(): string;
};

export type Role = "intern" | "resident" | "admin";
export type AccountType = "self-registered" | "bulk-generated";
export type AccountStatus = "pending-approval" | "active" | "expired" | "removed";

// Granular capability grants (spec 11.7/11.8). Kept in sync with the backend's
// CAPABILITIES constant. Extensible — add new capability keys here + backend.
export type Capability =
  | "generate-shift-key"
  | "finalize-discharge"
  | "close-follow-up"
  | "complete-operation-form"
  | "manage-roster"
  | "set-day-type-calendar"
  | "bypass-shift-key";

export const CAPABILITY_OPTIONS: { key: Capability; label: string; description: string }[] = [
  { key: "generate-shift-key", label: "Generate shift key", description: "Create a new ward shift key, retiring the previous one." },
  { key: "finalize-discharge", label: "Finalize discharge", description: "Discharge patients and mark cases for follow-up." },
  { key: "close-follow-up", label: "Close follow-ups", description: "Close cases and follow-up visits after review." },
  { key: "complete-operation-form", label: "Complete operation forms", description: "Create and edit operation records." },
  { key: "manage-roster", label: "Manage roster", description: "Import the rotation roster and assign shifts." },
  { key: "set-day-type-calendar", label: "Set day-type calendar", description: "Mark days as normal, clinic, or emergency." },
  { key: "bypass-shift-key", label: "Bypass shift key", description: "Write patient data without entering the ward shift key." },
];

export interface User {
  _id?: ObjectId;
  fullName: string;
  role: Role;
  loginId: string; // the login credential — email for self-registered, hpb<phone> for bulk-generated (spec 3.1)
  email?: string | null;
  phone?: string; // canonical identity key, normalized digits — reliable match key for imports (spec 3.1 / 6.1)
  passwordHash: string;
  accountType: AccountType;
  status: AccountStatus;
  approvedBy?: ObjectId | null;
  approvedAt?: Date | null;
  mustChangePassword: boolean;
  expiresAt?: Date | null; // set for bulk-generated accounts: createdAt + 50 days
  rotationImportId?: ObjectId | null;
  grantedCapabilities?: Capability[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RotationImportRow {
  name: string;
  email?: string | null;
  number?: string;
  generatedUserId?: string;
  generatedLoginId?: string;
  generatedPassword?: string;
  status: "created" | "existing" | "error";
  errorReason?: string;
}

export interface RotationImport {
  _id?: ObjectId;
  uploadedBy: ObjectId;
  uploadedAt: Date;
  sourceFileName: string;
  rows: RotationImportRow[];
}

export type Sex = "male" | "female";

export interface Patient {
  _id?: ObjectId;
  medicalNumber: string;
  fullName: string;
  sex: Sex;
  age: number;
  createdAt: Date;
  updatedAt: Date;
}

export type EncounterType = "emergency" | "ward" | "clinic";
export type CaseType = "hernia" | "biliary" | "hepatic" | "custom";
export type TemplateUsed = "hernia" | "biliary" | "hepatic" | "generic";
export type EncounterStatus = "active" | "discharged" | "follow-up-pending" | "closed" | "referred-out";

export interface Encounter {
  _id?: ObjectId;
  patientId: ObjectId;
  type: EncounterType;
  caseType: CaseType;
  customCaseTypeLabel?: string | null; // free-text name when caseType === "custom", e.g. "Appendicitis"
  status: EncounterStatus;
  ward?: Sex | null;
  openedAt: Date;
  closedAt?: Date | null;
  openedBy: ObjectId;
  linkedFollowUpOf?: ObjectId | null;
}

export type NoteContext = "new-case" | "emergency-assessment" | "specialty-consult" | "follow-up";

export interface ClinicalNote {
  _id?: ObjectId;
  encounterId: ObjectId;
  context: NoteContext;
  authoredBy: ObjectId;
  presentingLine: string;
  pmhx: { condition: string; detail: string }[];
  pshx: { procedure: string; date?: Date; outcome?: string }[];
  complaint: {
    main: string;
    duration: string;
    associated: string[];
    pertinentNegatives: string[];
    bowelHabit: "normal" | "constipation" | "diarrhea";
    dysuria: boolean;
    viralHepatitis: { hcv: boolean; hbv: boolean; hiv: boolean };
  };
  generalExam: {
    consciousness: "A" | "confused" | "obtunded";
    bp: string;
    hr: number;
    ecgRequired: boolean;
    ecgDone: boolean;
    echoRequired: boolean;
    echoDone: boolean;
  };
  localExam: { templateUsed: TemplateUsed; fields: Record<string, unknown> };
  riskFactors: Record<string, unknown>;
  investigationsOrdered: string[];
  recommendation: string;
  treatmentOrders: string[];
  createdAt: Date;
}

export interface CaseTypeTemplateField {
  fieldKey: string;
  label: string;
  type: "text" | "boolean" | "select";
  options?: string[];
}

export interface CaseTypeTemplate {
  _id?: ObjectId;
  name: string;
  leChecklist: CaseTypeTemplateField[];
  riskFactorChecklist: { fieldKey: string; label: string }[];
  labPanelPreset: string[];
  dietInstruction: string;
  active: boolean;
}

export type LabCategory =
  | "CBC" | "RFTs" | "Electrolytes" | "LiverFTs" | "Coagulation"
  | "CardiacE" | "Virology" | "Thyroid" | "SepsisP" | "Others";

export interface LabResultEntry {
  date: Date;
  category: LabCategory;
  test: string;
  value: string;
  unit?: string;
  refRange?: string;
  abnormal?: boolean;
  abnormalFlag?: "H" | "L";
}

export interface LabPanel {
  _id?: ObjectId;
  encounterId: ObjectId;
  results: LabResultEntry[];
  presetTests?: string[];
}

export interface LabTestNameMapping {
  _id?: ObjectId;
  externalTestName: string;
  internalTestKey: string;
  category: LabCategory;
}

export interface LabImportExtractedTest {
  externalTestName: string;
  result: string;
  unit?: string;
  refRange?: string;
  category?: LabCategory;
  abnormal?: boolean;
  abnormalFlag?: "H" | "L";
}

export interface LabImport {
  _id?: ObjectId;
  sourceFileName: string;
  patientCode: string;
  matchedPatientId?: ObjectId | null;
  matchedEncounterId?: ObjectId | null;
  requestDate: Date;
  extractedTests: LabImportExtractedTest[];
  status: "matched" | "needs-review";
  importedBy: ObjectId;
  importedAt: Date;
}

export interface ImagingRequest {
  _id?: ObjectId;
  encounterId: ObjectId;
  modality: "CT" | "US" | "Doppler" | "MRI" | "X-ray" | "Mammography";
  modalityDetail: string;
  clinicalDiagnosis: string;
  pertinentClinicalData: string;
  partToBeExamined: string;
  aimOfExamination: string;
  requestedBy: ObjectId;
  requestedAt: Date;
  status: "requested" | "scheduled" | "resulted";
  appointment?: { date: Date; time: string; instructions: string } | null;
  result?: string | null;
  resultAttachedAt?: Date | null;
}

export interface ReferralConsult {
  _id?: ObjectId;
  encounterId: ObjectId;
  toSpecialty: string;
  reason: string;
  referredBy: ObjectId;
  referredAt: Date;
  status: "pending" | "reviewed";
  recommendations?: string | null;
  imageData?: string | null;
  reviewedAt?: Date | null;
  reviewedBy?: ObjectId | null;
  reviewNoteId?: ObjectId | null; // the ClinicalNote written when the consult was reviewed
}

export interface TreatmentLogEntry {
  date: Date;
  treatment: string;
  otherRecommendations: string;
  physician: ObjectId;
}

export interface TreatmentLog {
  _id?: ObjectId;
  encounterId: ObjectId;
  entries: TreatmentLogEntry[];
}

export interface OperationForm {
  _id?: ObjectId;
  encounterId: ObjectId;
  patientNo: string;
  procedureName: string;
  preOpDiagnosis: string;
  postOpDiagnosis: string;
  surgeon: ObjectId;
  assistants: ObjectId[];
  anesthesiaType: string;
  anesthetist: string;
  findings: string;
  procedureDetails: string;
  specimensSent: string[];
  estimatedBloodLoss: string;
  complications: string;
  postOpPlan: string;
  date: Date;
  surgeonName?: string;
  assistantNames?: string[];
}

export interface DischargeForm {
  _id?: ObjectId;
  encounterId: ObjectId;
  dischargeDate: Date;
  summary: string;
  followUpRequired: boolean;
  followUpInstructions?: string | null;
  dischargedBy: ObjectId;
}

export interface FormTemplate {
  _id?: ObjectId;
  name: string;
  fields: { fieldKey: string; label: string; type: string; options?: string[] }[];
  savedToSystem: boolean;
  createdBy: ObjectId;
}

export interface FormRecord {
  _id?: ObjectId;
  encounterId: ObjectId;
  templateId: ObjectId;
  values: Record<string, unknown>;
  createdBy: ObjectId;
  createdAt: Date;
}

export type DayType = "normal" | "clinic" | "emergency";

export interface DayTypeCalendar {
  _id?: ObjectId;
  date: Date;
  dayType: DayType;
  surgeryOverlay: boolean;
}

export type ShiftType = "long" | "night" | "24hr" | "surgery-partial";
export type ShiftCategory = "ward" | "clinic" | "emergency-route" | "typing" | "ward-prep" | "none";

export interface RoleSlotDefinition {
  _id?: ObjectId;
  dayType: DayType;
  personType: "intern" | "resident";
  shiftType: ShiftType;
  category: ShiftCategory;
  label: string;
  weekdays?: number[]; // 0=Sunday … 6=Saturday; absent = every day of the dayType
}

export interface ShiftAssignment {
  _id?: ObjectId;
  date: Date;
  roleSlotDefinitionId: ObjectId;
  userIds: ObjectId[]; // a slot can hold a duty group, not just one person (spec 6.1)
  startTime?: string;
  endTime?: string;
}

export type EmergencyPoolShiftType = "long" | "night";

export interface EmergencyDayPool {
  _id?: ObjectId;
  date: Date;
  shiftType: EmergencyPoolShiftType;
  userIds: ObjectId[];
  createdBy: ObjectId;
  createdAt: Date;
}

export interface AuditLog {
  _id?: ObjectId;
  collection: string;
  documentId: ObjectId;
  action: "create" | "update" | "delete";
  summary: string;
  performedBy: ObjectId;
  performedAt: Date;
  shiftKey?: string | null; // the shift key attached to a gated write (spec 11.6)
  shiftKeyMatched?: boolean | null; // false when an offline replay's stored key was stale
}

// A ward "shift key" (spec 11.6): a short code interns must present to write
// patient data. Generated by users holding the generate-shift-key capability
// (admin/resident always; intern only when granted). Only one is active at a
// time; generating a new one deactivates the previous.
export interface ShiftKey {
  _id?: ObjectId;
  key: string;
  generatedBy: ObjectId;
  generatedAt: Date;
  active: boolean;
}

// Attendance record (spec 11.8): per (user, day) present/absent mark, kept by
// the admin/resident who runs the intern profile page.
export interface Attendance {
  _id?: ObjectId;
  userId: ObjectId;
  date: Date; // local midnight
  status: "present" | "absent";
  note?: string | null;
  markedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
