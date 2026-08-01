import type { CaseType, DayType, LabCategory } from "@/lib/models/types";

// Central brand strings (were previously hardcoded in layout/manifest/AppShell).
export const DEPARTMENT_NAME = "HPB Department";
export const APP_NAME = "HPB";

// Shift model (spec §6): a 24-hour shift starts and ends at 08:00 local time.
export const SHIFT_START_HOUR = 8;

// Faded guide examples shown in name text boxes (both script styles).
export const NAME_PLACEHOLDER = "Abdelrahman / Nour";

// Calendar date key (YYYY-MM-DD) in LOCAL time — matches how roster days are
// keyed (dates are stored at local midnight and must never be sliced in UTC).
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const CASE_TYPES: { value: CaseType; label: string }[] = [
  { value: "hernia", label: "Hernia" },
  { value: "biliary", label: "Biliary" },
  { value: "hepatic", label: "Hepatic" },
  { value: "custom", label: "Custom" },
];

// Human-readable case type for display; custom cases show their free-text name.
export function caseTypeDisplay(caseType: string, customCaseTypeLabel?: string | null): string {
  if (caseType === "custom") return customCaseTypeLabel?.trim() || "Custom";
  return CASE_TYPES.find((c) => c.value === caseType)?.label || caseType;
}

export const DAY_TYPES: { value: DayType; label: string }[] = [
  { value: "normal", label: "Normal day" },
  { value: "clinic", label: "Clinic day" },
  { value: "emergency", label: "Emergency day" },
];

export const LAB_CATEGORIES: LabCategory[] = [
  "CBC",
  "RFTs",
  "Electrolytes",
  "LiverFTs",
  "Coagulation",
  "CardiacE",
  "Virology",
  "Thyroid",
  "SepsisP",
  "Others",
];
