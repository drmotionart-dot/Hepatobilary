import type { CaseType, DayType, EncounterType, LabCategory } from "@/lib/models/types";

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

export const ENCOUNTER_TYPES: { value: EncounterType; label: string }[] = [
  { value: "emergency", label: "Emergency" },
  { value: "ward", label: "Ward" },
  { value: "clinic", label: "Clinic" },
];

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
