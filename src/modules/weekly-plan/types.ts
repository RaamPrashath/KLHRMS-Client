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

export interface PlanExportPayload {
  format: PlanExportFormat;
  title?: string;
  periodLabel?: string;
  dateColumns?: string[];
  employees: PlanExportEmployee[];
  rows: PlanExportRow[];
}
