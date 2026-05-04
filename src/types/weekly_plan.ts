// ── Work location enum ────────────────────────────────────────────────────────
// Must stay in sync with WorkLocationType StrEnum in KLhrms-api/app/utils/enums.py

export const WorkLocationType = {
  HOME:    "home",
  OFFICE:  "office",
  HYBRID:  "hybrid",
  LEAVE:   "leave",
  HOLIDAY: "holiday",
} as const;

export type WorkLocationType = (typeof WorkLocationType)[keyof typeof WorkLocationType];

export const WORK_LOCATION_LABELS: Record<WorkLocationType, string> = {
  home:    "Home",
  office:  "Office",
  hybrid:  "Hybrid",
  leave:   "Leave",
  holiday: "Holiday",
};

// ── Domain model (mirrors WeeklyPlanRead from the API) ────────────────────────

export interface WeeklyPlanEntry {
  id:              string;
  organizationId:  string;
  userId:          string;
  date:            string; // ISO date string "YYYY-MM-DD"
  workLocation:    WorkLocationType;
  project:         string | null;
}

// ── API input types ───────────────────────────────────────────────────────────

export interface SetDayInput {
  work_location: WorkLocationType;
  project?:      string | null;
}
