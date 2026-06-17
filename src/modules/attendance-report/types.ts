export interface AttendanceReportEmployeeOption {
  id: string;
  name: string;
  email: string | null;
}

export interface AttendanceReportProjectOption {
  id: string;
  name: string;
  members: AttendanceReportEmployeeOption[];
}

export interface AttendanceReportOptionsResponse {
  employees: AttendanceReportEmployeeOption[];
  projects: AttendanceReportProjectOption[];
  departments: AttendanceReportDepartmentOption[];
}

export interface AttendanceReportRow {
  attendanceRecordId: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string | null;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  departmentName: string | null;
  projectName: string | null;
  clientName: string | null;
  taskName: string | null;
  clockOutDescription: string | null;
  leaveTypeName?: string | null;
  entryType?: string | null;
}

export interface AttendanceReportSummary {
  total_days: number;
  total_hours: number;
  employee_count: number;
}

export interface AttendanceReportListResponse {
  items: AttendanceReportRow[];
  total: number;
  page: number;
  page_size: number;
  summary: AttendanceReportSummary;
}

export interface AttendanceReportDepartmentOption {
  id: string;
  name: string;
}

export interface AttendanceReportFilters {
  date_from: string;
  date_to: string;
  project_id?: string;
  employee_ids?: string[];
  department_id?: string;
  page?: number;
  page_size?: number;
}

export type AttendanceReportExportFormat = 'xlsx' | 'pdf' | 'csv';
export type AttendanceReportExportMode = 'report' | 'timesheet';

export interface AttendanceReportExportEmployee {
  id: string;
  name: string;
  email: string | null;
}

export interface AttendanceReportExportPayload {
  format: AttendanceReportExportFormat;
  mode: AttendanceReportExportMode;
  title: string;
  periodLabel: string;
  dateColumns: string[];
  employees: AttendanceReportEmployeeOption[];
  rows: AttendanceReportRow[];
  force8: boolean;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
}
