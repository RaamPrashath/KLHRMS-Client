// Employee Module Types

export type AttendanceTodayStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'WORK_FROM_HOME'
  | 'HALF_DAY'
  | 'NO_RECORD';

export interface AttendanceTodayInfo {
  status: AttendanceTodayStatus;
  clock_in: string | null;
  clock_out: string | null;
}

export interface RoleBrief {
  id: string;
  name: string;
}

export interface DepartmentBrief {
  id: string;
  name: string;
}

export interface EmployeeListItem {
  member_id: string;
  user_id: string;
  name: string;
  email: string;
  image: string | null;
  role: RoleBrief | null;
  department: DepartmentBrief | null;
  joined_at: string;
  attendance_today: AttendanceTodayInfo;
}

export interface EmployeeListResponse {
  items: EmployeeListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EmployeeFilterOption {
  id: string;
  name: string;
}

export interface EmployeeFilters {
  search: string;
  departmentId: string | undefined;
  roleId: string | undefined;
  attendanceStatus: AttendanceTodayStatus | undefined;
  page: number;
  pageSize: number;
}

export interface ApiError {
  status: number;
  message: string;
}
