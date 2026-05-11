"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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

interface DashboardShellProps {
  orgSlug: string;
  memberId: string;
  roleName: string | null;
  permissions: RolePermissions | null;
}

interface DashboardShortcut {
  href: string;
  title: string;
  subtitle: string;
  icon: typeof CalendarClock;
  iconClassName: string;
  permissionKey: string;
}

function formatRangeLabel(startDate: string, endDate: string, days: number): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const range = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  });

  if (startDate === endDate) {
    return `${range.format(start)} - ${days} day${days === 1 ? "" : "s"}`;
  }

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

function DashboardCard({
  children,
  className,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={cn(
        "rounded-[18px] border border-hairline bg-canvas",
        className,
      )}
    >
      {children}
    </section>
  );
}

function DashboardSectionHeader({
  title,
  count,
}: Readonly<{
  title: string;
  count?: number;
}>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[17px] font-semibold tracking-[-0.374px] text-ink">
        {title}
      </h2>
      {typeof count === "number" ? (
        <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[14px] font-medium text-ink-muted-80">
          {count}
        </span>
      ) : null}
    </div>
  );
}

function MemberChip({
  label,
  tone = "default",
}: Readonly<{
  label: string;
  tone?: "default" | "muted";
}>) {
  return (
    <div
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-full border border-hairline bg-canvas px-3 text-[14px] transition-colors",
        tone === "default" ? "text-ink" : "text-ink-muted-48",
      )}
    >
      {tone === "default" && (
        <span className="size-1.5 rounded-full bg-primary" />
      )}
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
    <div className="flex flex-col gap-4 border-t border-hairline px-6 py-5 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[14px] font-semibold text-ink-muted-80">
            {memberName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase())
              .join("") || "U"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold tracking-[-0.374px] text-ink">{memberName}</p>
            <p className="mt-0.5 text-[14px] text-ink-muted-48">
              {request.leaveType.name} · {formatRangeLabel(request.startDate, request.endDate, request.days)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="rounded-[11px] border-hairline bg-surface-pearl px-4 py-2 text-[14px] text-ink-muted-80 hover:bg-surface-muted hover:text-ink active:scale-[0.95]"
          onClick={() => onReject(request.id)}
          disabled={isApproving || isRejecting}
        >
          Deny
        </Button>
        <Button
          type="button"
          className="rounded-pill bg-primary px-5 py-2 text-[14px] text-white hover:bg-primary-focus active:scale-[0.95]"
          onClick={() => onApprove(request.id)}
          disabled={isApproving || isRejecting}
        >
          Approve
        </Button>
      </div>
    </div>
  );
}

function AttendanceOverviewSection({
  orgSlug,
  memberId,
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "memberId">>) {
  const today = getTodayIST();
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

  const { clockedInMembers, notClockedInMembers } = useMemo(() => {
    const members = contextQuery.data?.members ?? [];
    const attendanceItems = attendanceQuery.data?.items ?? [];
    const activeIds = new Set(
      attendanceItems
        .filter((record) => record.clockIn && !record.clockOut)
        .map((record) => record.employeeId),
    );

    return {
      clockedInMembers: members.filter((member) => activeIds.has(member.memberId)),
      notClockedInMembers: members.filter((member) => !activeIds.has(member.memberId)),
    };
  }, [attendanceQuery.data?.items, contextQuery.data?.members]);

  return (
    <DashboardCard className="overflow-hidden">
      <div className="grid divide-y divide-divider-soft md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="space-y-6 p-6">
          <DashboardSectionHeader title="Clocked In" count={clockedInMembers.length} />
          {attendanceQuery.isLoading || contextQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-9 animate-pulse rounded-full bg-surface-muted" />
              ))}
            </div>
          ) : clockedInMembers.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {clockedInMembers.map((member) => (
                <MemberChip
                  key={member.memberId}
                  label={getDisplayName(member.name, member.email ?? member.memberId)}
                />
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-ink-muted-48">No one is clocked in right now.</p>
          )}
        </div>

        <div className="space-y-6 p-6">
          <DashboardSectionHeader title="Not Clocked In" count={notClockedInMembers.length} />
          {attendanceQuery.isLoading || contextQuery.isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="h-9 animate-pulse rounded-full bg-surface-muted" />
              ))}
            </div>
          ) : notClockedInMembers.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {notClockedInMembers.map((member) => (
                <MemberChip
                  key={member.memberId}
                  label={getDisplayName(member.name, member.email ?? member.memberId)}
                  tone="muted"
                />
              ))}
            </div>
          ) : (
            <p className="text-[14px] text-ink-muted-48">Everyone is currently clocked in.</p>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}

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
    approveMutation
      .mutateAsync({
        leaveRequestId: requestId,
        data: { approverComment: "" },
      })
      .then(() => {
        toast.success("Leave request approved");
      })
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error, "Failed to approve leave request"));
      });
  }

  function handleReject(requestId: string) {
    rejectMutation
      .mutateAsync({
        leaveRequestId: requestId,
        data: { approverComment: "" },
      })
      .then(() => {
        toast.success("Leave request rejected");
      })
      .catch((error: unknown) => {
        toast.error(getErrorMessage(error, "Failed to reject leave request"));
      });
  }

  return (
    <DashboardCard className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 pb-4 pt-6">
        <DashboardSectionHeader
          title="Leave Requests"
          count={leaveRequestsQuery.data?.total ?? 0}
        />
      </div>

      {leaveRequestsQuery.isLoading ? (
        <div className="space-y-4 px-6 pb-6">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-surface-muted" />
          ))}
        </div>
      ) : (leaveRequestsQuery.data?.items?.length ?? 0) > 0 ? (
        <div>
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
        <div className="px-6 pb-6 text-[14px] text-ink-muted-48">
          No pending leave requests right now.
        </div>
      )}
    </DashboardCard>
  );
}

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

  const shortcuts: DashboardShortcut[] = useMemo(
    () =>
      [
        {
          href: `/${orgSlug}/weekly-plan`,
          title: "See plans",
          subtitle: "Weekly schedule",
          icon: CalendarClock,
          iconClassName: "bg-[#e8f8f1] text-primary",
          permissionKey: "weeklyPlan",
        },
        {
          href: `/${orgSlug}/projects`,
          title: "Projects",
          subtitle: "Active work items",
          icon: FolderKanban,
          iconClassName: "bg-[#eeecff] text-[#5c50d6]",
          permissionKey: "projects",
        },
        {
          href: `/${orgSlug}/departments`,
          title: "Departments",
          subtitle: "Teams and org units",
          icon: Building2,
          iconClassName: "bg-[#eaf2ff] text-[#3467c8]",
          permissionKey: "departments",
        },
      ].filter((shortcut) => hasPermission(permissions, shortcut.permissionKey)),
    [orgSlug, permissions],
  );

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-6">
      <DashboardClockWidget
        orgSlug={orgSlug}
        memberId={memberId}
        roleName={roleName}
      />

      {canViewOrgAttendance ? (
        <AttendanceOverviewSection orgSlug={orgSlug} memberId={memberId} />
      ) : null}

      {canApproveLeave ? (
        <PendingLeaveRequestsSection orgSlug={orgSlug} memberId={memberId} />
      ) : null}

      {shortcuts.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map((shortcut) => {
            const Icon = shortcut.icon;

            return (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="group rounded-[18px] border border-hairline bg-canvas p-6 transition-colors hover:bg-surface-subtle"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-muted text-ink">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-[17px] font-semibold tracking-[-0.374px] text-ink">
                        {shortcut.title}
                      </p>
                      <p className="mt-0.5 text-[14px] text-ink-muted-48">{shortcut.subtitle}</p>
                    </div>
                  </div>
                  <ArrowRight className="size-5 text-ink-muted-48 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}

      <TodayWorkLogsCard orgSlug={orgSlug} memberId={memberId} />
    </div>
  );
}

function DefaultDashboardContent({
  orgSlug,
  memberId,
  roleName,
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "memberId" | "roleName">>) {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <DashboardClockWidget
        orgSlug={orgSlug}
        memberId={memberId}
        roleName={roleName}
      />
      <TodayWorkLogsCard orgSlug={orgSlug} memberId={memberId} />
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
    return (
      <DefaultDashboardContent
        orgSlug={orgSlug}
        memberId={memberId}
        roleName={roleName}
      />
    );
  }

  return (
    <AdminDashboardContent
      orgSlug={orgSlug}
      memberId={memberId}
      roleName={roleName}
      permissions={permissions}
    />
  );
}
