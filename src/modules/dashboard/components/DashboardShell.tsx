"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  Inbox,
  Search,
  Umbrella,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  FloatingPanelBody,
  FloatingPanelCloseButton,
  FloatingPanelContent,
  FloatingPanelRoot,
  FloatingPanelTrigger,
} from "@/components/ui/floating-panel";
import { Input } from "@/components/ui/input";
import { useApiClient } from "@/hooks/useApiClient";
import { useTeamWeeklyPlanQuery } from "@/hooks/queries/weekly_plan";
import { cn } from "@/lib/utils";
import type { RolePermissions } from "@/lib/hrms-roles";
import { getScope, hasPermission } from "@/lib/hrms-roles";
import { useAttendanceQuery } from "@/modules/attendance/hooks/queries/attendance";
import { resolveAttendancePermissions } from "@/modules/attendance/utils/attendancePermissions";
import { getTodayIST } from "@/modules/attendance/utils/attendanceFormatters";
import { fetchLeavePageContextAction } from "@/modules/leave/api/leaveServerActions";
import { useApproveLeaveRequest } from "@/modules/leave/hooks/useApproveLeaveRequest";
import { useLeaveRequests } from "@/modules/leave/hooks/useLeaveRequests";
import { useRejectLeaveRequest } from "@/modules/leave/hooks/useRejectLeaveRequest";
import type { LeaveRequestRecord } from "@/modules/leave/types/leaveTypes";
import { canApproveLeaves, resolveLeavePermissions } from "@/modules/leave/utils/leavePermissions";
import { getCurrentWeekState } from "@/modules/weekly-plan/date";
import { InviteEmployeeDialog } from "@/modules/employees/components/InviteEmployeeDialog";
import { DashboardClockWidget } from "./DashboardClockWidget";
import { DashboardTopBar } from "./DashboardTopBar";
import { WorkLogHeatmapCard } from "./WorkLogHeatmapCard";
import { JobOpeningsCard } from "./JobOpeningsCard";

interface DashboardShellProps {
  orgSlug: string;
  orgId: string;
  memberId: string;
  roleName: string | null;
  permissions: RolePermissions | null;
}

function formatRangeLabel(startDate: string, endDate: string, days: number): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const range = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
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

const CHIP_COLORS: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 border border-blue-200",
  purple: "bg-purple-50 text-purple-700 border border-purple-200",
  gray: "bg-neutral-100 text-neutral-500 border border-neutral-200",
};

function MemberChip({
  label,
  color = "gray",
}: Readonly<{ label: string; color?: "blue" | "purple" | "gray" }>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        CHIP_COLORS[color],
      )}
    >
      {label}
    </span>
  );
}

function AttendanceOverviewSection({
  orgSlug,
  orgId,
  memberId,
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "orgId" | "memberId">>) {
  const today = getTodayIST();
  const [search, setSearch] = useState("");
  const auth = useApiClient(orgId);
  const currentWeek = useMemo(() => getCurrentWeekState(), []);

  const contextQuery = useQuery({
    queryKey: ["leave-context", orgSlug, memberId],
    queryFn: () => fetchLeavePageContextAction({ orgSlug, memberId }),
    staleTime: 60_000,
  });
  const attendanceQuery = useAttendanceQuery(orgSlug, memberId, {
    dateFrom: today, dateTo: today, page: 1, pageSize: 200,
  });
  const { data: leaveData } = useLeaveRequests(orgSlug, memberId, {
    status: "APPROVED", fromDate: today, toDate: today, page: 1, pageSize: 200,
  });
  const teamWeeklyPlanQuery = useTeamWeeklyPlanQuery(
    orgSlug,
    orgId,
    memberId,
    currentWeek.year,
    currentWeek.week,
    true,
  );

  const { officeClockedInMembers, remoteClockedInMembers, notClockedInMembers, absentMembers } = useMemo(() => {
    const members = contextQuery.data?.members ?? [];
    const attendanceItems = attendanceQuery.data?.items ?? [];
    const activeIds = new Set(
      attendanceItems.filter((r) => r.clockIn && !r.clockOut).map((r) => r.employeeId),
    );
    const onLeaveMemberIds = new Set((leaveData?.items ?? []).map((l) => l.memberId));
    const locationByUserId = new Map(
      (teamWeeklyPlanQuery.data ?? [])
        .filter((entry) => entry.date === today)
        .map((entry) => [entry.user_id, entry.work_location]),
    );

    const officeClockedInMembers = members.filter((member) => {
      if (!activeIds.has(member.memberId)) return false;
      return locationByUserId.get(member.userId) !== "WFH";
    });

    const remoteClockedInMembers = members.filter((member) => {
      if (!activeIds.has(member.memberId)) return false;
      return locationByUserId.get(member.userId) === "WFH";
    });

    return {
      officeClockedInMembers,
      remoteClockedInMembers,
      absentMembers: members.filter((m) => !activeIds.has(m.memberId) && onLeaveMemberIds.has(m.memberId)),
      notClockedInMembers: members.filter((m) => !activeIds.has(m.memberId) && !onLeaveMemberIds.has(m.memberId)),
    };
  }, [attendanceQuery.data?.items, contextQuery.data?.members, leaveData?.items, teamWeeklyPlanQuery.data, today]);

  const filterFn = (m: { name: string | null; email: string | null }) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.name ?? "").toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
  };

  const isLoading = attendanceQuery.isLoading || contextQuery.isLoading || (auth != null && teamWeeklyPlanQuery.isLoading);
  const sections = [
    { label: "Clocked In (Office)", members: officeClockedInMembers, color: "blue" as const },
    { label: "Clocked In (Work From Home)", members: remoteClockedInMembers, color: "purple" as const },
    { label: "Not Clocked In", members: notClockedInMembers, color: "gray" as const },
  ];
  const filteredAbsentMembers = absentMembers.filter(filterFn);
  const filteredAbsentCount = filteredAbsentMembers.length;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-neutral-900">Today&apos;s Attendance</h2>
        <div className="flex max-w-md flex-1 items-center justify-end gap-2.5">
          <FloatingPanelRoot>
            <FloatingPanelTrigger
              title="Absent Members"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white px-3.5 text-[12px] font-medium text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              <span className="inline-flex items-center justify-center gap-2 leading-none">
                Absent
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold leading-none text-neutral-900">
                  {filteredAbsentCount}
                </span>
              </span>
            </FloatingPanelTrigger>
            <FloatingPanelContent className="w-[min(calc(100vw-2rem),22rem)] max-h-[min(34rem,calc(100vh-2rem))] overflow-hidden rounded-[18px] border-neutral-200 shadow-[0_20px_70px_rgba(0,0,0,0.16)]">
              <FloatingPanelBody className="max-h-[calc(min(34rem,100vh-2rem)-2.75rem)] overflow-y-auto px-4 pb-4 pt-1">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[12px] font-medium text-neutral-400">
                    Members on approved leave today
                  </p>
                  <FloatingPanelCloseButton className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7]" />
                </div>

                {isLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="h-11 animate-pulse rounded-xl bg-neutral-100" />
                    ))}
                  </div>
                ) : filteredAbsentMembers.length > 0 ? (
                  <div className="space-y-2">
                    {filteredAbsentMembers.map((member) => (
                      <div
                        key={member.memberId}
                        className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5"
                      >
                        <p className="text-[13px] font-medium text-neutral-900">
                          {getDisplayName(member.name, member.email ?? member.memberId)}
                        </p>
                        <p className="mt-0.5 text-[12px] text-neutral-500">
                          {member.email ?? member.memberId}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-neutral-400">No absent members found.</p>
                )}
              </FloatingPanelBody>
            </FloatingPanelContent>
          </FloatingPanelRoot>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 border-0 bg-canvas pl-9 text-sm focus:border focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/10"
            />
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((s) => {
          const filtered = s.members.filter(filterFn);
          return (
            <div key={s.label} className="rounded-[8px] border border-zinc-200/80 bg-white/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                {s.label} <span className="ml-1.5 text-neutral-900">{filtered.length}</span>
              </p>
              {isLoading ? (
                <div className="flex flex-wrap gap-2">
                  {[1, 2].map((i) => <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-neutral-100" />)}
                </div>
              ) : filtered.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {filtered.map((m) => (
                    <MemberChip key={m.memberId} label={getDisplayName(m.name, m.email ?? m.memberId)} color={s.color} />
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-neutral-400">None</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PendingLeaveRequestsSection({
  orgSlug,
  memberId,
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "memberId">>) {
  const leaveRequestsQuery = useLeaveRequests(orgSlug, memberId, {
    status: "PENDING", page: 1, pageSize: 3,
  });
  const approveMutation = useApproveLeaveRequest(orgSlug, memberId);
  const rejectMutation = useRejectLeaveRequest(orgSlug, memberId);

  function handleApprove(requestId: string) {
    approveMutation.mutateAsync({ leaveRequestId: requestId, data: { approverComment: "" } })
      .then(() => toast.success("Leave request approved"))
      .catch((error: unknown) => toast.error(getErrorMessage(error, "Failed to approve")));
  }

  function handleReject(requestId: string) {
    rejectMutation.mutateAsync({ leaveRequestId: requestId, data: { approverComment: "" } })
      .then(() => toast.success("Leave request rejected"))
      .catch((error: unknown) => toast.error(getErrorMessage(error, "Failed to reject")));
  }

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-4">
        <div className="min-w-0">
          <h2 className="text-[0.9375rem] font-semibold text-neutral-900">Leave Requests</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Incoming employee time-off approval requests pipeline.
          </p>
        </div>
      </div>

      <div className="mt-5">
        {leaveRequestsQuery.isLoading ? (
          <div className="flex min-h-[180px] gap-3 rounded-xl border border-dashed border-zinc-200 bg-neutral-50/50 p-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-12 flex-1 animate-pulse rounded-lg bg-neutral-100" />)}
          </div>
        ) : (leaveRequestsQuery.data?.items?.length ?? 0) > 0 ? (
          <div className="overflow-hidden rounded-xl border border-zinc-200/80 bg-neutral-50/20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            {(leaveRequestsQuery.data?.items ?? []).map((request) => (
              <LeaveRequestRow
                key={request.id}
                request={request}
                isApproving={approveMutation.isPending}
                isRejecting={rejectMutation.isPending}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-neutral-50/20 px-4 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="mx-auto flex min-h-[180px] max-w-md flex-col items-center justify-center text-center">
              <div className="mb-3.5 flex size-11 items-center justify-center rounded-full bg-zinc-100 text-neutral-400">
                <Inbox className="size-5" />
              </div>
              <p className="text-sm font-semibold text-neutral-900">No leave requests pending</p>
              <p className="mt-1.5 max-w-[320px] text-xs text-neutral-400 leading-relaxed">
                New approvals will appear here automatically when someone submits a leave form request.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
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
    <div className="flex items-center justify-between gap-4 border-b border-black/4 px-5 py-3.5 last:border-0">
      <div className="min-w-0 flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-[11px] font-medium text-primary">
          {memberName.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">{memberName}</p>
          <p className="text-xs text-neutral-500">{request.leaveType.name} · {formatRangeLabel(request.startDate, request.endDate, request.days)}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 rounded-lg text-xs transition-all active:scale-[0.98] duration-100"
          onClick={() => onReject(request.id)}
          disabled={isApproving || isRejecting}
        >
          Deny
        </Button>
        <Button
          size="sm"
          className="h-8 rounded-lg bg-primary text-xs text-white hover:bg-primary-hover active:scale-[0.98] transition-all duration-100"
          onClick={() => onApprove(request.id)}
          disabled={isApproving || isRejecting}
        >
          Approve
        </Button>
      </div>
    </div>
  );
}

function AdminActionItem({
  title,
  description,
  href,
  actionLabel,
  children,
}: Readonly<{
  title: string;
  description: string;
  href?: string;
  actionLabel?: string;
  children?: React.ReactNode;
}>) {
  const content = (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-200/70 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all hover:border-zinc-300 hover:bg-zinc-50/40">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-neutral-800">{title}</p>
        <p className="mt-0.5 text-xs text-neutral-400 leading-normal">{description}</p>
      </div>
      {children ?? (
        actionLabel ? (
          <Button
            variant="outline"
            className="h-8 rounded-lg border-zinc-200 bg-white px-3.5 text-xs font-semibold text-neutral-700 hover:bg-zinc-50 transition-all duration-100 active:scale-[0.98]"
          >
            {actionLabel}
          </Button>
        ) : null
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-all duration-150 active:scale-[0.99]">
        {content}
      </Link>
    );
  }

  return content;
}

function EmployeeHeroBanner({
  orgSlug,
  memberId,
  roleName,
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "memberId" | "roleName">>) {
  return (
    <section className="rounded-2xl bg-(--color-sidebar-bg) px-7 py-3 shadow-[0_10px_28px_rgba(14,20,35,0.22)]">
      <DashboardClockWidget orgSlug={orgSlug} memberId={memberId} roleName={roleName} />
    </section>
  );
}

function QuickShortcutsCard({ orgSlug }: { readonly orgSlug: string }) {
  const shortcuts = [
    {
      href: `/${orgSlug}/weekly-plan`,
      label: "Weekly Plan",
      icon: CalendarDays,
      iconBg: "bg-[#e6f7f0]",
      iconColor: "text-[#059669]",
    },
    {
      href: `/${orgSlug}/timesheet`,
      label: "Timesheet",
      icon: FileText,
      iconBg: "bg-[#eef2ff]",
      iconColor: "text-[#4f46e5]",
    },
    {
      href: `/${orgSlug}/leaves/requests`,
      label: "Leave Request",
      icon: Umbrella,
      iconBg: "bg-[#fdf2f8]",
      iconColor: "text-[#db2777]",
    },
  ];

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <h2 className="mb-4 text-[0.9375rem] font-semibold text-neutral-900">Quick Shortcuts</h2>
      <div className="grid grid-cols-3 gap-3">
        {shortcuts.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-center gap-3 rounded-xl border border-zinc-200/70 bg-white px-4 py-3 transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50/80 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] active:scale-[0.98]"
            >
              <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", s.iconBg, s.iconColor)}>
                <Icon className="size-4" aria-hidden="true" />
              </div>
              <span className="min-w-0 flex-1 text-[0.8125rem] font-medium text-neutral-700">
                {s.label}
              </span>
              <ArrowRight className="size-3.5 shrink-0 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function OpenInternalPositionsCard({
  orgSlug,
  memberId,
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "memberId">>) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <JobOpeningsCard orgSlug={orgSlug} memberId={memberId} />
    </div>
  );
}

function HeatmapPanel({
  orgSlug,
  memberId,
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "memberId">>) {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <WorkLogHeatmapCard orgSlug={orgSlug} memberId={memberId} variant="default" />
    </div>
  );
}

function MainDashboardLayout({
  orgSlug,
  memberId,
  roleName,
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "memberId" | "roleName"> & {
}>) {
  return (
    <>
      <DashboardTopBar/>
      <EmployeeHeroBanner orgSlug={orgSlug} memberId={memberId} roleName={roleName} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-5">
          <QuickShortcutsCard orgSlug={orgSlug} />
          <OpenInternalPositionsCard orgSlug={orgSlug} memberId={memberId} />
        </div>
        <HeatmapPanel orgSlug={orgSlug} memberId={memberId} />
      </div>
    </>
  );
}

function AdminDashboardContent({
  orgSlug,
  orgId,
  memberId,
  roleName,
  permissions,
}: Readonly<DashboardShellProps>) {
  const attendancePermissions = resolveAttendancePermissions(permissions ?? {});
  const leavePermissions = resolveLeavePermissions(permissions ?? {});
  const canViewOrgAttendance = attendancePermissions.view === "organization";
  const canApproveLeave = canApproveLeaves(leavePermissions.approve);
  const canInviteEmployees = getScope(permissions, "employees", "create") !== "none";
  const canManageDepartments = hasPermission(permissions, "departments");
  const canManageAssets = hasPermission(permissions, "assets") || hasPermission(permissions, "maintenance");
  const canManagePermissions = hasPermission(permissions, "permission");
  const showAdminControlPanel =
    canApproveLeave || canInviteEmployees || canManageDepartments || canManageAssets || canManagePermissions;

  return (
    <div className="flex flex-col gap-5 p-3">
      <MainDashboardLayout orgSlug={orgSlug} memberId={memberId} roleName={roleName} />
      <div className="flex flex-col gap-6">
        {canViewOrgAttendance ? <AttendanceOverviewSection orgSlug={orgSlug} orgId={orgId} memberId={memberId} /> : null}
        {showAdminControlPanel ? (
          <div className={cn(
            "grid gap-6",
            canApproveLeave
              ? "xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.85fr)]"
              : "xl:grid-cols-[minmax(0,1fr)]",
          )}>
            {canApproveLeave ? <PendingLeaveRequestsSection orgSlug={orgSlug} memberId={memberId} /> : null}

            {(canInviteEmployees || canManageDepartments || canManageAssets || canManagePermissions) ? (
              <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <div className="flex items-start">
                  <div className="min-w-0">
                    <h2 className="text-[0.9375rem] font-semibold text-neutral-900">Quick Actions</h2>
                    <p className="mt-1 text-xs text-neutral-500">
                      Fast organizational control pathways.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3.5">
                  {canInviteEmployees ? (
                    <AdminActionItem
                      title="Invite employee"
                      description="Add to organization"
                    >
                      <InviteEmployeeDialog
                        orgSlug={orgSlug}
                        memberId={memberId}
                        triggerLabel="Invite"
                        triggerClassName="h-8 rounded-lg border border-zinc-200 bg-white px-3.5 text-xs font-semibold text-neutral-700 hover:bg-zinc-50 transition-all duration-100 active:scale-[0.98]"
                      />
                    </AdminActionItem>
                  ) : null}

                  {canManageDepartments ? (
                    <AdminActionItem
                      href={`/${orgSlug}/departments`}
                      title="Create Department"
                      description="Configure structures"
                      actionLabel="Action"
                    />
                  ) : null}

                  {canManageAssets ? (
                    <AdminActionItem
                      href={`/${orgSlug}/assets`}
                      title="Asset Requests"
                      description="Hardware allocations"
                      actionLabel="Reviews"
                    />
                  ) : null}

                  {canManagePermissions ? (
                    <AdminActionItem
                      href={`/${orgSlug}/permissions`}
                      title="User Roles"
                      description="Adjust permissions"
                      actionLabel="Roles"
                    />
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DefaultDashboardContent({
  orgSlug,
  memberId,
  roleName,
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "memberId" | "roleName">>) {
  return (
    <div className="flex flex-col gap-5 p-3">
      <MainDashboardLayout orgSlug={orgSlug} memberId={memberId} roleName={roleName} />
    </div>
  );
}

export function DashboardShell({
  orgSlug,
  orgId,
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

  return <AdminDashboardContent orgSlug={orgSlug} orgId={orgId} memberId={memberId} roleName={roleName} permissions={permissions} />;
}
