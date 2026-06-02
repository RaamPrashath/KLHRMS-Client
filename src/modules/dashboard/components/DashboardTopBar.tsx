"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMyTicketsQuery } from "@/modules/assets/hooks/useMyTicketsQuery";
import { useMaintenanceTicketsQuery } from "@/modules/assets/hooks/useMaintenanceTicketsQuery";
import { humanize } from "@/modules/assets/lib/assetUtils";
import { useLeaveRequests } from "@/modules/leave/hooks/useLeaveRequests";

type DashboardNotificationMode = "admin" | "employee";

function formatNotificationDate(dateString: string) {
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return dateString;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function formatLeaveRange(startDate: string, endDate: string, days: number): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const range = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
  if (startDate === endDate) return `${range.format(start)} - ${days} day${days === 1 ? "" : "s"}`;
  return `${range.format(start)}-${range.format(end)} - ${days} day${days === 1 ? "" : "s"}`;
}

export function DashboardTopBar({
  orgSlug,
  memberId,
  mode,
}: Readonly<{
  orgSlug: string;
  memberId: string;
  mode: DashboardNotificationMode;
}>) {
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  );
  const isAdminMode = mode === "admin";
  const maintenanceTicketsQuery = useMaintenanceTicketsQuery(orgSlug, memberId, { enabled: isAdminMode });
  const myTicketsQuery = useMyTicketsQuery(orgSlug, memberId, { enabled: !isAdminMode });
  const leaveApprovalsQuery = useLeaveRequests(
    orgSlug,
    memberId,
    { status: "APPROVED", page: 1, pageSize: 10 },
    { enabled: !isAdminMode },
  );

  const notifications = useMemo(() => {
    if (isAdminMode) {
      return (maintenanceTicketsQuery.data ?? [])
        .filter((ticket) => ticket.ticketMode === "GENERAL_HELP_REQUEST")
        .filter((ticket) => ticket.status === "OPEN" || ticket.status === "IN_PROGRESS")
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .map((ticket) => ({
          id: `admin-issue-${ticket.id}`,
          href: `/${orgSlug}/maintenance`,
          title: ticket.subject?.trim() || humanize(ticket.maintenanceType),
          meta: `${ticket.loggedByName || "Unknown employee"} | ${ticket.ticketId}`,
          date: ticket.createdAt,
        }));
    }

    const resolvedIssueNotifications = (myTicketsQuery.data ?? [])
      .filter((ticket) => ticket.ticketMode === "GENERAL_HELP_REQUEST")
      .filter((ticket) => ticket.status === "COMPLETED")
      .map((ticket) => ({
        id: `employee-issue-${ticket.id}`,
        href: `/${orgSlug}/helpdesk`,
        title: ticket.subject?.trim() || `${humanize(ticket.maintenanceType)} resolved`,
        meta: `Resolved | ${ticket.ticketId}`,
        date: ticket.updatedAt || ticket.createdAt,
      }));

    const leaveNotifications = (leaveApprovalsQuery.data?.items ?? []).map((request) => ({
      id: `leave-approved-${request.id}`,
      href: `/${orgSlug}/leaves/requests`,
      title: `${request.leaveType.name} approved`,
      meta: `${request.approver?.name || "Admin"} | ${formatLeaveRange(request.startDate, request.endDate, request.days)}`,
      date: request.updatedAt,
    }));

    return [...resolvedIssueNotifications, ...leaveNotifications]
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [isAdminMode, leaveApprovalsQuery.data?.items, maintenanceTicketsQuery.data, myTicketsQuery.data, orgSlug]);

  const visibleNotifications = notifications.slice(0, 4);

  const notificationCount = notifications.length;
  const isLoading = isAdminMode ? maintenanceTicketsQuery.isLoading : myTicketsQuery.isLoading || leaveApprovalsQuery.isLoading;

  return (
    <div className="flex min-h-10 items-center justify-end border-b border-[#dbe4ef] px-8 text-[#365887]">
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Open issue notifications"
              className="relative inline-flex size-8 items-center justify-center border-0 bg-transparent px-0 text-[#365887] shadow-none"
            >
              <Bell className="size-4" />
              {notificationCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-[#dc2626] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {notificationCount}
                </span>
              ) : null}
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="bottom"
            align="end"
            sideOffset={10}
            className="w-[22rem] rounded-2xl border border-[#dbe4ef] bg-white p-2 shadow-[0_20px_60px_rgba(0,0,0,0.14)]"
          >
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-xl bg-neutral-100" />
                ))}
              </div>
            ) : visibleNotifications.length > 0 ? (
              <div>
                {visibleNotifications.map((ticket, index) => (
                  <div key={ticket.id}>
                    <Link
                      href={ticket.href}
                      className="block rounded-xl bg-white px-3 py-3 transition-colors hover:bg-neutral-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 truncate text-[13px] font-medium text-neutral-900">
                          {ticket.title}
                        </p>
                        <p className="shrink-0 text-[11px] text-neutral-400">
                          {formatNotificationDate(ticket.date)}
                        </p>
                      </div>
                      <p className="mt-1 text-[12px] text-neutral-500">
                        {ticket.meta}
                      </p>
                    </Link>
                    {index < visibleNotifications.length - 1 ? (
                      <div className="mx-3 h-px bg-[#e8edf3]" />
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-3 text-[13px] text-neutral-400">
                {isAdminMode ? "No general issues raised yet." : "No new notifications yet."}
              </p>
            )}
          </PopoverContent>
        </Popover>

        <p className="text-[0.95rem] font-medium">{formattedDate}</p>
      </div>
    </div>
  );
}
