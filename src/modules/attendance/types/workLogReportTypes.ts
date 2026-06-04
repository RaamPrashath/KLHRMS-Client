export interface WorkLogReportRow {
  attendanceRecordId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  departmentName: string | null;
  projectName: string | null;
  taskName: string | null;
  dailyWorkLogPreview: string | null;
  hasFullLog: boolean;
}

export interface WorkLogReportSummary {
  total_days: number;
  total_hours: number;
  employee_count: number;
}

export interface WorkLogReportListResponse {
  items: WorkLogReportRow[];
  total: number;
  page: number;
  page_size: number;
  summary: WorkLogReportSummary;
}

export interface WorkLogReportDetailResponse {
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
  taskName: string | null;
  dailyWorkLog: string | null;
}

export interface WorkLogReportFilters {
  date_from?: string;
  date_to?: string;
  department_id?: string;
  employee_id?: string;
  employee_name?: string;
  page?: number;
  page_size?: number;
}
