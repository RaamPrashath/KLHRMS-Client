import type { AttendanceListResponse } from '@/modules/attendance/types/attendanceTypes';
import type { JobRequisitionRecord } from '@/modules/jobs/types/jobRequisitionTypes';
import type { LeaveMemberSummary, LeaveRequestListResponse } from '@/modules/leave/types/leaveTypes';
import type { WeeklyPlanEntry } from '@/hooks/functions/weekly_plan';

export interface DashboardCapabilities {
  attendanceOverview: boolean;
  leaveRequests: boolean;
  jobs: boolean;
}

export interface DashboardOverviewResponse {
  today: string;
  capabilities: DashboardCapabilities;
  members: LeaveMemberSummary[];
  attendanceToday: AttendanceListResponse | null;
  approvedLeavesToday: LeaveRequestListResponse | null;
  pendingLeaveRequests: LeaveRequestListResponse | null;
  jobRequisitions: JobRequisitionRecord[];
  teamWeeklyPlanToday: WeeklyPlanEntry[];
}
