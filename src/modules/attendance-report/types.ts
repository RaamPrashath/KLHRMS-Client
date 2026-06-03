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
  teamName: string | null;
  projectName: string | null;
  taskName: string | null;
  clockOutDescription: string | null;
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

export interface AttendanceReportFilters {
  date_from: string;
  date_to: string;
  project_id?: string;
  employee_ids?: string[];
  page?: number;
  page_size?: number;
}
