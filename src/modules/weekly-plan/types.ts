import type { PlanLocationValue } from "@/modules/weekly-plan/locations";

export type PlanExportFormat = "xlsx" | "pdf" | "csv";

export interface PlanExportEmployee {
  id: string;
  name: string;
  email: string | null;
}

export interface PlanExportRow {
  user_id: string;
  user_name: string | null;
  date: string;
  work_location: PlanLocationValue;
  project: string | null;
}

export interface PlanExportPivotDay {
  iso: string;
  dayLabel: string;
  dateLabel: string;
  planned: PlanLocationValue | null;
  actualLocation: string | null;
}

export interface PlanExportPivotRow {
  userId: string;
  name: string;
  days: PlanExportPivotDay[];
}

export interface PlanExportPayload {
  format: PlanExportFormat;
  title?: string;
  periodLabel?: string;
  viewMode: "weekly" | "monthly" | "monthly_pivot";
  employees?: PlanExportEmployee[];
  rows?: PlanExportRow[];
  pivotData?: PlanExportPivotRow[];
}
