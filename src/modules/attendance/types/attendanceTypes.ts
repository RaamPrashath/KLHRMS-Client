// Attendance Module Types

export type AttendanceStatus = 'PRESENT' | 'HALF_DAY' | 'ABSENT';
export type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT' | 'NO_RECORD';
export type PermissionScope = 'none' | 'self' | 'department' | 'organization';
export type AttendanceWorkLocation = 'OFFICE' | 'REMOTE';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  organizationId: string;
  date: string;           // ISO date "YYYY-MM-DD"
  clockIn: string | null; // ISO datetime
  clockOut: string | null;
  description: string | null;
  totalHours: number | null;
  overtimeHours: number | null;
  status: AttendanceStatus;
  isRemote: boolean;
  enteredByManagerId: string | null;
  createdAt: string;
  /** Populated for org-scope list queries; null for self-scope. */
  employeeName: string | null;
}

export interface AttendanceListResponse {
  items: AttendanceRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface DerivedAttendanceSummary {
  presentDays: number;
  halfDays: number;
  absentDays: number;
  totalHours: number;
  overtimeHours: number;
  clockStatus: ClockStatus;
}

export interface ApiError {
  status: number;
  message: string;
}

export interface AttendanceClockContext {
  plannedLocation: 'OFFICE' | 'WFH' | 'LEAVE' | 'HOLIDAY' | null;
  office: {
    latitude: number;
    longitude: number;
    radiusMeters: number;
  } | null;
}

export type AttendanceTimePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'last_calendar_week'
  | 'last_month'
  | 'all_time'
  | 'custom';

export interface AttendanceFiltersState {
  timePreset: AttendanceTimePreset;
  dateFrom: string | undefined;
  dateTo: string | undefined;
  status: AttendanceStatus | undefined;
  targetMemberId: string | undefined;
  /** Employee name search — org-scope only, sent as employee_name query param */
  employeeNameSearch: string | undefined;
  page: number;
  pageSize: number;
}

export interface AttendancePermissions {
  view: PermissionScope;
  create: PermissionScope;
  edit: PermissionScope;
  delete: PermissionScope;
}
