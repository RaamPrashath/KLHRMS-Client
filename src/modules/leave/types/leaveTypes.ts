export type LeavePermissionScope = 'none' | 'self' | 'team' | 'department' | 'organization';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeavePermissions {
  view: LeavePermissionScope;
  create: LeavePermissionScope;
  approve: LeavePermissionScope;
}

export interface LeaveMemberSummary {
  memberId: string;
  userId: string;
  name: string | null;
  email: string | null;
}

export interface LeaveTypeRecord {
  id: string;
  organizationId: string;
  name: string;
  quota: number;
  carryForward: boolean;
  isPaid: boolean;
  color: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayRecord {
  id: string;
  organizationId: string;
  name: string;
  holidayDate: string;
  isHoliday: boolean;
  isRecurring: boolean;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayListResponse {
  items: HolidayRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface LeaveRequestRecord {
  id: string;
  organizationId: string;
  memberId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: LeaveRequestStatus;
  approvedById: string | null;
  approverComment: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  member: LeaveMemberSummary;
  approver: LeaveMemberSummary | null;
  leaveType: LeaveTypeRecord;
}

export interface LeaveBalanceRecord {
  id: string;
  organizationId: string;
  memberId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  used: number;
  remaining: number;
  carriedForward: number;
  lapsed: number;
  createdAt: string;
  updatedAt: string;
  member: LeaveMemberSummary;
  leaveType: LeaveTypeRecord;
}

export interface LeaveRequestListResponse {
  items: LeaveRequestRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface LeaveBalanceListResponse {
  items: LeaveBalanceRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface LeaveCalendarResponse {
  holidays: HolidayRecord[];
  leaveRequests: LeaveRequestRecord[];
}

export interface LeavePageContext {
  permissions: Record<string, Record<string, string>>;
  members: LeaveMemberSummary[];
}

export interface ApiError {
  status: number;
  message: string;
}

export interface LeaveRequestFiltersState {
  status?: LeaveRequestStatus;
  memberId?: string;
  leaveTypeId?: string;
  fromDate?: string;
  toDate?: string;
  year?: number;
  page: number;
  pageSize: number;
}

export interface LeaveBalanceFiltersState {
  memberId?: string;
  leaveTypeId?: string;
  year?: number;
  page: number;
  pageSize: number;
}

export interface LeaveCalendarFiltersState {
  year: number;
  month: number;
}

export interface LeaveSummaryRequestItem {
  id: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  days: number;
}

export interface EmployeeLeaveSummary {
  memberId: string;
  name: string | null;
  email: string | null;
  totalDays: number;
  items: LeaveSummaryRequestItem[];
}

export interface LeaveSummaryListResponse {
  items: EmployeeLeaveSummary[];
  total: number;
  page: number;
  page_size: number;
}
