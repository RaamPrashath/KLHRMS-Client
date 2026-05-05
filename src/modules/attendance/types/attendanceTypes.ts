// Attendance Module Types

export type AttendanceStatus = 'PRESENT' | 'HALF_DAY' | 'ABSENT';
export type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT' | 'NO_RECORD';
export type PermissionScope = 'none' | 'self' | 'team' | 'department' | 'organization';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  organizationId: string;
  date: string;           // ISO date "YYYY-MM-DD"
  clockIn: string | null; // ISO datetime
  clockOut: string | null;
  totalHours: number | null;
  overtimeHours: number | null;
  status: AttendanceStatus;
  enteredByManagerId: string | null;
  createdAt: string;
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

export interface AttendanceFiltersState {
  dateFrom: string | undefined;
  dateTo: string | undefined;
  status: AttendanceStatus | undefined;
  targetMemberId: string | undefined;
  page: number;
  pageSize: number;
}

export interface AttendancePermissions {
  view: PermissionScope;
  create: PermissionScope;
  edit: PermissionScope;
  delete: PermissionScope;
}
