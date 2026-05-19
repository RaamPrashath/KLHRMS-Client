"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  Inbox,
  Search,
  Umbrella,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { InviteEmployeeDialog } from "@/modules/employees/components/InviteEmployeeDialog";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
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

function MemberChip({
  label,
  tone = "default",
}: Readonly<{ label: string; tone?: "default" | "muted" }>) {
  return (
    <div
      className={cn(
        "inline-flex min-h-8 items-center gap-2 rounded-full border border-black/4 bg-canvas px-2.5 text-[13px] transition-colors",
        tone === "default" ? "text-neutral-900" : "text-neutral-500",
      )}
    >
      {tone === "default" && <span className="size-1.5 rounded-full bg-primary" />}
      {label}
    </div>
  );
}

// ─── Tier 2 (Admin): Today's Attendance ─────────────────────────────────────

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
    dateFrom: today, dateTo: today, page: 1, pageSize: 200,
  });
  const { data: leaveData } = useLeaveRequests(orgSlug, memberId, {
    status: "APPROVED", fromDate: today, toDate: today, page: 1, pageSize: 200,
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
    return {
      clockedInMembers: members.filter((m) => activeIds.has(m.memberId)),
      onLeaveMembers: members.filter((m) => !activeIds.has(m.memberId) && onLeaveMemberIds.has(m.memberId)),
      notClockedInMembers: members.filter((m) => !activeIds.has(m.memberId) && !onLeaveMemberIds.has(m.memberId)),
    };
  }, [attendanceQuery.data?.items, contextQuery.data?.members, leaveData?.items]);

  const filterFn = (m: { name: string | null; email: string | null }) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (m.name ?? "").toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
  };

  const isLoading = attendanceQuery.isLoading || contextQuery.isLoading;

  const sections = [
    { label: "Clocked In", members: clockedInMembers, tone: "default" as const },
    { label: "Not Clocked In", members: notClockedInMembers, tone: "muted" as const },
    { label: "On Leave", members: onLeaveMembers, tone: "muted" as const },
  ];

  return (
    <section>
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-base font-semibold text-neutral-900">Today&apos;s Attendance</h2>
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
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((s) => {
          const filtered = s.members.filter(filterFn);
          return (
            <div key={s.label} className="rounded-[8px] border border-zinc-200/80 bg-white/80 p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:border-zinc-800/60 dark:bg-[#0A0A0C] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.015)]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                {s.label} <span className="ml-1.5 text-neutral-900">{filtered.length}</span>
              </p>
              {isLoading ? (
                <div className="flex flex-wrap gap-2">
                  {[1, 2].map((i) => <div key={i} className="h-7 w-20 animate-pulse rounded-full bg-neutral-100" />)}
                </div>
              ) : filtered.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {filtered.map((m) => (
                    <MemberChip key={m.memberId} label={getDisplayName(m.name, m.email ?? m.memberId)} tone={s.tone} />
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

// ─── Tier 2 (Admin): Leave Requests ─────────────────────────────────────────

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
    <section>
      <h2 className="text-base font-semibold text-neutral-900 mb-4">Leave Requests</h2>
      {leaveRequestsQuery.isLoading ? (
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 flex-1 animate-pulse rounded-2xl bg-neutral-100" />)}
        </div>
      ) : (leaveRequestsQuery.data?.items?.length ?? 0) > 0 ? (
        <div className="rounded-[8px] border border-zinc-200/80 bg-white/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:border-zinc-800/60 dark:bg-[#0A0A0C] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] overflow-hidden">
          {(leaveRequestsQuery.data?.items ?? []).map((request) => (
            <LeaveRequestRow key={request.id} request={request} isApproving={approveMutation.isPending} isRejecting={rejectMutation.isPending} onApprove={handleApprove} onReject={handleReject} />
          ))}
        </div>
      ) : (
        <div className="rounded-[8px] border border-dashed border-zinc-200 bg-white/80 px-5 py-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:border-zinc-800/60 dark:bg-[#0A0A0C]">
          <div className="mx-auto flex max-w-sm flex-col items-center text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-neutral-50 text-neutral-400">
              <Inbox className="size-5" />
            </div>
            <p className="text-sm font-semibold text-neutral-900">No leave requests pending</p>
            <p className="mt-1 text-[13px] text-neutral-500">
              New approvals will appear here when someone submits a leave request.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function LeaveRequestRow({
  request, isApproving, isRejecting, onApprove, onReject,
}: Readonly<{
  request: LeaveRequestRecord;
  isApproving: boolean; isRejecting: boolean;
  onApprove: (requestId: string) => void; onReject: (requestId: string) => void;
}>) {
  const memberName = getDisplayName(request.member.name, "Unnamed member");
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/4 px-5 py-3.5 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold text-neutral-500">
          {memberName.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">{memberName}</p>
          <p className="text-xs text-neutral-500">{request.leaveType.name} · {formatRangeLabel(request.startDate, request.endDate, request.days)}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={() => onReject(request.id)} disabled={isApproving || isRejecting}>Deny</Button>
        <Button size="sm" className="bg-primary text-white hover:opacity-90" onClick={() => onApprove(request.id)} disabled={isApproving || isRejecting}>Approve</Button>
      </div>
    </div>
  );
}

// ─── Quick Links stack (vertical, for bento bottom-left cell) ───────────────

function QuickLinksStack({ orgSlug }: { orgSlug: string }) {
  const links = [
    { href: `/${orgSlug}/weekly-plan`, label: "Weekly Plan", icon: CalendarDays, color: "bg-[#e8f8f1] text-primary" },
    { href: `/${orgSlug}/timesheet`, label: "Timesheet", icon: Clock, color: "bg-[#eef2ff] text-[#4f46e5]" },
    { href: `/${orgSlug}/leaves/requests`, label: "Leave", icon: Umbrella, color: "bg-[#fdf2f8] text-[#db2777]" },
  ];

  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04] pb-3">
        <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">Quick Links</h2>
      </div>
      <div className="flex flex-1 flex-col justify-between gap-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-1 items-center gap-3 rounded-xl border border-zinc-200/80 bg-white/60 px-4 py-3 transition-all duration-300 hover:border-zinc-300 hover:bg-white hover:scale-[1.015] dark:border-zinc-800/60 dark:bg-zinc-950/60 dark:hover:bg-zinc-900/80 dark:hover:border-zinc-700/80 shadow-[0_1px_2px_rgba(0,0,0,0.015)]"
            >
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${link.color}`}>
                <Icon className="size-4" />
              </div>
              <p className="min-w-0 flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {link.label}
              </p>
              <ArrowRight className="size-4 shrink-0 text-neutral-400" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bento dashboard layout ──────────────────────────────────────────────────

function BentoDashboardGrid({
  orgSlug,
  memberId,
  roleName,
  variant = "admin",
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "memberId" | "roleName"> & {
  variant?: "admin" | "employee";
}>) {
  const isEmployeeVariant = variant === "employee";

  return (
    <BentoGrid
      className={cn(
        "max-w-none md:grid-cols-8 gap-6",
        isEmployeeVariant
          ? "md:auto-rows-[31rem] lg:auto-rows-[32.5rem] xl:auto-rows-[34rem]"
          : "md:auto-rows-[24rem] lg:auto-rows-[25rem] xl:auto-rows-[26rem]",
      )}
    >
      {/* ── Top-left: Clock In / Clock Out ── */}
      <BentoGridItem
        className="md:col-span-4 p-6 flex flex-col justify-between h-full"
        header={
          <DashboardClockWidget
            orgSlug={orgSlug}
            memberId={memberId}
            roleName={roleName}
          />
        }
      />

      {/* ── Top-right: Calendar heatmap ── */}
      <BentoGridItem
        className="md:col-span-4 p-6 flex flex-col h-full"
        header={
          <WorkLogHeatmapCard
            orgSlug={orgSlug}
            memberId={memberId}
            variant={isEmployeeVariant ? "employee" : "default"}
          />
        }
      />

      {/* ── Bottom-left: Quick Links stack ── */}
      <BentoGridItem
        className="md:col-span-3 p-6 flex flex-col justify-between h-full"
        header={
          <QuickLinksStack orgSlug={orgSlug} />
        }
      />

      {/* ── Bottom-right: Open Positions ── */}
      <BentoGridItem
        className="md:col-span-5 p-6 flex flex-col h-full overflow-hidden"
        header={
          <div className="h-full overflow-auto">
            <JobOpeningsCard orgSlug={orgSlug} memberId={memberId} />
          </div>
        }
      />
    </BentoGrid>
  );
}

// ─── Dashboard variants ──────────────────────────────────────────────────────

function AdminDashboardContent({
  orgSlug, memberId, roleName, permissions,
}: Readonly<DashboardShellProps>) {
  const attendancePermissions = resolveAttendancePermissions(permissions ?? {});
  const leavePermissions = resolveLeavePermissions(permissions ?? {});
  const canViewOrgAttendance = attendancePermissions.view === "organization";
  const canApproveLeave = canApproveLeaves(leavePermissions.approve);

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6">
      {/* Primary bento grid */}
      <BentoDashboardGrid orgSlug={orgSlug} memberId={memberId} roleName={roleName} variant="admin" />

      {/* Admin-only: Attendance overview + Leave requests */}
      <div className="flex flex-col gap-6">
        {canViewOrgAttendance ? <AttendanceOverviewSection orgSlug={orgSlug} memberId={memberId} /> : null}
        {canApproveLeave ? <PendingLeaveRequestsSection orgSlug={orgSlug} memberId={memberId} /> : null}
      </div>

      {/* Invite Employee */}
      {getScope(permissions, 'employees', 'create') !== 'none' && (
        <section>
          <h2 className="text-base font-semibold text-neutral-900 mb-4">Quick Actions</h2>
          <div className="relative overflow-hidden rounded-[8px] border border-zinc-200/80 bg-white/80 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:border-zinc-800/60 dark:bg-[#0A0A0C] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.015)] flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Invite a new employee</p>
              <p className="text-[13px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                Add someone to the organization with a role and default password
              </p>
            </div>
            <InviteEmployeeDialog orgSlug={orgSlug} memberId={memberId} />
          </div>
        </section>
      )}

    </div>
  );
}

function DefaultDashboardContent({
  orgSlug, memberId, roleName,
}: Readonly<Pick<DashboardShellProps, "orgSlug" | "memberId" | "roleName">>) {
  return (
    <div className="flex flex-col gap-8 p-4 sm:p-6">
      {/* Primary bento grid */}
      <BentoDashboardGrid orgSlug={orgSlug} memberId={memberId} roleName={roleName} variant="employee" />

      {/* Today's Work Logs below the bento */}
      <TodayWorkLogsCard orgSlug={orgSlug} memberId={memberId} />
    </div>
  );
}

export function DashboardShell({
  orgSlug, memberId, roleName, permissions,
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
