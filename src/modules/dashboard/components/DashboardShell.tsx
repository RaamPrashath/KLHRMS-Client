"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Search,
  Umbrella,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RolePermissions } from "@/lib/hrms-roles";
import { hasPermission } from "@/lib/hrms-roles";
import { useAttendanceQuery } from "@/modules/attendance/hooks/queries/attendance";
import { resolveAttendancePermissions } from "@/modules/attendance/utils/attendancePermissions";
import { getTodayIST } from "@/modules/attendance/utils/attendanceFormatters";
import { fetchLeavePageContextAction } from "@/modules/leave/api/leaveServerActions";
import { useApproveLeaveRequest } from "@/modules/leave/hooks/useApproveLeaveRequest";
import { useLeaveRequests } from "@/modules/leave/hooks/useLeaveRequests";
import { useRejectLeaveRequest } from "@/modules/leave/hooks/useRejectLeaveRequest";
import type { LeaveRequestRecord } from "@/modules/leave/types/leaveTypes";
import { canApproveLeaves, resolveLeavePermissions } from "@/modules/leave/utils/leavePermissions";
import { DashboardClockWidget } from "./DashboardClockWidget";
import { TodayWorkLogsCard } from "./TodayWorkLogsCard";
import { WorkLogHeatmapCard } from "./WorkLogHeatmapCard";
import { JobOpeningsCard } from "./JobOpeningsCard";

interface DashboardShellProps {
  orgSlug: string;
  memberId: string;
  roleName: string | null;
  permissions: RolePermissions | null;
}

function formatRangeLabel(startDate: string, endDate: string, days: number): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const range = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  });
  if (startDate === endDate) return `${range.format(start)} - ${days} day${days === 1 ? "" : "s"}`;
  return `${range.format(start)}-${range.format(end)} - ${days} day${days === 1 ? "" : "s"}`;
}

function getDisplayName(name: string | null, fallback: string): string {
  return name?.trim() || fallback;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as { message?: string };
      return parsed.message ?? fallback;
    } catch {
      return error.message || fallback;
    }
  }
  return fallback;
}

function MemberChip({
  label,
  tone = "default",
}: Readonly<{ label: string; tone?: "default" | "muted" }>) {
  return (
    <div
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-full border border-hairline bg-canvas px-3 text-[14px] transition-colors",
        tone === "default" ? "text-ink" : "text-ink-muted-48",
      )}
    >
      {tone === "default" && <span className="size-1.5 rounded-full bg-primary" />}
      {label}
    </div>
  );
}

function LeaveRequestRow({
  request,
  isApproving,
  isRejecting,
  onApprove,
  onReject,
}: Readonly<{
  request: LeaveRequestRecord;
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}>) {
  const memberName = getDisplayName(request.member.name, "Unnamed member");
  return (
    <div className="flex flex-col gap-4 border-b border-black/4 px-6 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[14px] font-semibold text-neutral-500">
            {memberName.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-neutral-900">{memberName}</p>
            <p className="mt-0.5 text-[13px] text-neutral-500">
              {request.leaveType.name} · {formatRangeLabel(request.startDate, request.endDate, request.days)}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:justify-end">
        <Button variant="outline" size="sm" onClick={() => onReject(request.id)} disabled={isApproving || isRejecting}>
          Deny
        </Button>
        <Button size="sm" className="bg-primary text-white hover:bg-primary-hover" onClick={() => onApprove(request.id)} disabled={isApproving || isRejecting}>
          Approve
        </Button>
      </div>
    </div>
  );
}

// ─── Section 2: Attendance Overview (admin only) ─────────────────────────────

function AttendanceOverviewSection({
  orgSlug,
  memberId,
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "memberId">>) {
  const today = getTodayIST();
  const [search, setSearch] = useState("");

  const contextQuery = useQuery({
    queryKey: ["leave-context", orgSlug, memberId],
    queryFn: () => fetchLeavePageContextAction({ orgSlug, memberId }),
    staleTime: 60_000,
  });
  const attendanceQuery = useAttendanceQuery(orgSlug, memberId, {
    dateFrom: today,
    dateTo: today,
    page: 1,
    pageSize: 200,
  });
  const { data: leaveData } = useLeaveRequests(orgSlug, memberId, {
    status: "APPROVED",
    fromDate: today,
    toDate: today,
    page: 1,
    pageSize: 200,
  });

  const { clockedInMembers, notClockedInMembers, onLeaveMembers } = useMemo(() => {
    const members = contextQuery.data?.members ?? [];
    const attendanceItems = attendanceQuery.data?.items ?? [];
    const activeIds = new Set(
      attendanceItems.filter((r) => r.clockIn && !r.clockOut).map((r) => r.employeeId),
    );
    const onLeaveMemberIds = new Set(
      (leaveData?.items ?? []).map((l) => l.memberId),
    );

    const clockedIn = members.filter((m) => activeIds.has(m.memberId));
    const onLeave = members.filter((m) => !activeIds.has(m.memberId) && onLeaveMemberIds.has(m.memberId));
    const notClockedIn = members.filter((m) => !activeIds.has(m.memberId) && !onLeaveMemberIds.has(m.memberId));

    return { clockedInMembers: clockedIn, notClockedInMembers: notClockedIn, onLeaveMembers: onLeave };
  }, [attendanceQuery.data?.items, contextQuery.data?.members, leaveData?.items]);

  const filterFn = (m: { name: string | null; email: string | null }) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.name ?? "").toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
  };

  const filteredClockedIn = useMemo(() => clockedInMembers.filter(filterFn), [clockedInMembers, search]);
  const filteredNotClockedIn = useMemo(() => notClockedInMembers.filter(filterFn), [notClockedInMembers, search]);
  const filteredOnLeave = useMemo(() => onLeaveMembers.filter(filterFn), [onLeaveMembers, search]);

  const isLoading = attendanceQuery.isLoading || contextQuery.isLoading;

  return (
    <section className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
      <div className="px-6 py-5 border-b border-black/[0.04] flex items-center justify-between gap-4">
        <h2 className="text-[17px] font-semibold text-neutral-900 tracking-tight">Today&apos;s Attendance</h2>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <Input
            placeholder="Search members…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-canvas border-0 focus:bg-surface focus:border focus:border-primary focus:ring-[3px] focus:ring-primary/10 text-sm h-9"
          />
        </div>
      </div>
      <div className="grid divide-y divide-black/4 md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-3">
            Clocked In <span className="ml-1.5 text-neutral-900">{filteredClockedIn.length}</span>
          </p>
          {isLoading ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-neutral-100" />)}
            </div>
          ) : filteredClockedIn.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filteredClockedIn.map((m) => (
                <MemberChip key={m.memberId} label={getDisplayName(m.name, m.email ?? m.memberId)} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-neutral-400">No one is clocked in right now.</p>
          )}
        </div>

        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-3">
            Not Clocked In <span className="ml-1.5 text-neutral-900">{filteredNotClockedIn.length}</span>
          </p>
          {isLoading ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-neutral-100" />)}
            </div>
          ) : filteredNotClockedIn.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filteredNotClockedIn.map((m) => (
                <MemberChip key={m.memberId} label={getDisplayName(m.name, m.email ?? m.memberId)} tone="muted" />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-neutral-400">Everyone is clocked in.</p>
          )}
        </div>

        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-3">
            On Leave <span className="ml-1.5 text-neutral-900">{filteredOnLeave.length}</span>
          </p>
          {isLoading ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-neutral-100" />)}
            </div>
          ) : filteredOnLeave.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filteredOnLeave.map((m) => (
                <MemberChip key={m.memberId} label={getDisplayName(m.name, m.email ?? m.memberId)} tone="muted" />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-neutral-400">No one on leave today.</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Section 3: Leave Requests (admin only) ─────────────────────────────────

function PendingLeaveRequestsSection({
  orgSlug,
  memberId,
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "memberId">>) {
  const leaveRequestsQuery = useLeaveRequests(orgSlug, memberId, {
    status: "PENDING",
    page: 1,
    pageSize: 3,
  });
  const approveMutation = useApproveLeaveRequest(orgSlug, memberId);
  const rejectMutation = useRejectLeaveRequest(orgSlug, memberId);

  function handleApprove(requestId: string) {
    approveMutation.mutateAsync({ leaveRequestId: requestId, data: { approverComment: "" } })
      .then(() => toast.success("Leave request approved"))
      .catch((error: unknown) => toast.error(getErrorMessage(error, "Failed to approve leave request")));
  }

  function handleReject(requestId: string) {
    rejectMutation.mutateAsync({ leaveRequestId: requestId, data: { approverComment: "" } })
      .then(() => toast.success("Leave request rejected"))
      .catch((error: unknown) => toast.error(getErrorMessage(error, "Failed to reject leave request")));
  }

  return (
    <section className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
      <div className="px-6 py-5 border-b border-black/[0.04] flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-neutral-900 tracking-tight">Leave Requests</h2>
        {leaveRequestsQuery.data?.total ? (
          <span className="text-sm text-neutral-500">{leaveRequestsQuery.data.total} pending</span>
        ) : null}
      </div>

      {leaveRequestsQuery.isLoading ? (
        <div className="space-y-4 p-6">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-neutral-100" />)}
        </div>
      ) : (leaveRequestsQuery.data?.items?.length ?? 0) > 0 ? (
        <div>
          {(leaveRequestsQuery.data?.items ?? []).map((request) => (
            <LeaveRequestRow key={request.id} request={request} isApproving={approveMutation.isPending} isRejecting={rejectMutation.isPending} onApprove={handleApprove} onReject={handleReject} />
          ))}
        </div>
      ) : (
        <div className="px-6 py-10 text-sm text-neutral-400 text-center">No pending leave requests.</div>
      )}
    </section>
  );
}
function QuickLinksCard({ orgSlug }: { orgSlug: string }) {
  return (
    <section className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
      <div className="px-6 py-5 border-b border-black/[0.04]">
        <h2 className="text-[17px] font-semibold text-neutral-900 tracking-tight">Quick Links</h2>
      </div>
      <div className="flex flex-col gap-1 p-4">
        <Link href={`/${orgSlug}/weekly-plan`} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-black/[0.02]">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e8f8f1] text-primary"><CalendarDays className="size-5" /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-medium text-neutral-900">Weekly Plan</p><p className="text-xs text-neutral-500 mt-0.5">Set your week</p></div>
          <ArrowRight className="size-4 text-neutral-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
        </Link>
        <Link href={`/${orgSlug}/timesheet`} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-black/[0.02]">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f46e5]"><Clock className="size-5" /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-medium text-neutral-900">Timesheet</p><p className="text-xs text-neutral-500 mt-0.5">Log your hours</p></div>
          <ArrowRight className="size-4 text-neutral-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
        </Link>
        <Link href={`/${orgSlug}/leaves/requests`} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-black/[0.02]">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fdf2f8] text-[#db2777]"><Umbrella className="size-5" /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-medium text-neutral-900">Leave</p><p className="text-xs text-neutral-500 mt-0.5">Request time off</p></div>
          <ArrowRight className="size-4 text-neutral-400 transition-transform group-hover:translate-x-0.5 shrink-0" />
        </Link>
      </div>
    </section>
  );
}


// ─── Section 4 & 5 shared components ──────────────────────────────────────────

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboardContent({
  orgSlug,
  memberId,
  roleName,
  permissions,
}: Readonly<DashboardShellProps>) {
  const attendancePermissions = resolveAttendancePermissions(permissions ?? {});
  const leavePermissions = resolveLeavePermissions(permissions ?? {});
  const canViewOrgAttendance = attendancePermissions.view === "organization";
  const canApproveLeave = canApproveLeaves(leavePermissions.approve);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      {/* Section 1: Clock-in (full width) */}
      <DashboardClockWidget orgSlug={orgSlug} memberId={memberId} roleName={roleName} />

      {/* Section 2: Attendance Overview (admin only) */}
      {canViewOrgAttendance ? <AttendanceOverviewSection orgSlug={orgSlug} memberId={memberId} /> : null}

      {/* Section 3: Leave Requests (admin only) */}
      {canApproveLeave ? <PendingLeaveRequestsSection orgSlug={orgSlug} memberId={memberId} /> : null}

      {/* Section 4: Quick Links (left) + Heatmap (right) */}
      <div className="grid gap-5 lg:grid-cols-2">
        <QuickLinksCard orgSlug={orgSlug} />
        <WorkLogHeatmapCard orgSlug={orgSlug} memberId={memberId} />
      </div>

      {/* Section 5: Job Openings (left) + Work Logs (right) */}
      <div className="grid gap-5 lg:grid-cols-2">
        <JobOpeningsCard orgSlug={orgSlug} memberId={memberId} />
        <TodayWorkLogsCard orgSlug={orgSlug} memberId={memberId} />
      </div>
    </div>
  );
}

// ─── Default Dashboard ────────────────────────────────────────────────────────

function DefaultDashboardContent({
  orgSlug,
  memberId,
  roleName,
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "memberId" | "roleName">>) {
  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      {/* Section 1: Clock-in (full width) */}
      <DashboardClockWidget orgSlug={orgSlug} memberId={memberId} roleName={roleName} />

      {/* Section 4: Quick Links (left) + Heatmap (right) */}
      <div className="grid gap-5 lg:grid-cols-2">
        <QuickLinksCard orgSlug={orgSlug} />
        <WorkLogHeatmapCard orgSlug={orgSlug} memberId={memberId} />
      </div>

      {/* Section 5: Job Openings (left) + Work Logs (right) */}
      <div className="grid gap-5 lg:grid-cols-2">
        <JobOpeningsCard orgSlug={orgSlug} memberId={memberId} />
        <TodayWorkLogsCard orgSlug={orgSlug} memberId={memberId} />
      </div>
    </div>
  );
}

export function DashboardShell({
  orgSlug,
  memberId,
  roleName,
  permissions,
}: Readonly<DashboardShellProps>) {
  const attendancePermissions = resolveAttendancePermissions(permissions ?? {});
  const leavePermissions = resolveLeavePermissions(permissions ?? {});
  const showAdminDashboard =
    attendancePermissions.view === "organization" ||
    canApproveLeaves(leavePermissions.approve) ||
    hasPermission(permissions, "weeklyPlan") ||
    hasPermission(permissions, "projects") ||
    hasPermission(permissions, "departments");

  if (!showAdminDashboard) {
    return <DefaultDashboardContent orgSlug={orgSlug} memberId={memberId} roleName={roleName} />;
  }

  return <AdminDashboardContent orgSlug={orgSlug} memberId={memberId} roleName={roleName} permissions={permissions} />;
}
