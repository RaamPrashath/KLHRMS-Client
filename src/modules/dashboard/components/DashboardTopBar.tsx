"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bell, Circle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMarkNotificationRead, useNotificationsQuery, useNotificationUnreadCountQuery } from "@/modules/notifications/hooks/useNotifications";

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

export function DashboardTopBar({
  orgSlug,
  memberId,
}: Readonly<{
  orgSlug: string;
  memberId: string;
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
  const notificationsQuery = useNotificationsQuery(orgSlug, memberId, { status: "all", limit: 5 });
  const unreadCountQuery = useNotificationUnreadCountQuery(orgSlug, memberId);
  const markReadMutation = useMarkNotificationRead(orgSlug, memberId);
  const visibleNotifications = notificationsQuery.data?.items ?? [];
  const notificationCount = unreadCountQuery.data?.unreadCount ?? notificationsQuery.data?.unreadCount ?? 0;
  const isLoading = notificationsQuery.isLoading || unreadCountQuery.isLoading;

  return (
    <div className="hidden md:flex min-h-10 items-center justify-end border-b border-[#dbe4ef] px-8 text-[#365887]">
      <div className="flex items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Open notifications"
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
            className="w-[23rem] rounded-2xl border border-[#dbe4ef] bg-white p-2 shadow-[0_20px_60px_rgba(0,0,0,0.14)]"
          >
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 animate-pulse rounded-xl bg-neutral-100" />
                ))}
              </div>
            ) : visibleNotifications.length > 0 ? (
              <div>
                {visibleNotifications.map((notification, index) => (
                  <div key={notification.id}>
                    <Link
                      href={notification.actionUrl || `/${orgSlug}/notifications`}
                      onClick={() => {
                        if (notification.status === "UNREAD") {
                          markReadMutation.mutate(notification.id);
                        }
                      }}
                      className="block rounded-xl bg-white px-3 py-3 transition-colors hover:bg-neutral-50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#eef5fd] text-[#3d5f88]">
                          <Bell className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 truncate text-[13px] font-medium text-neutral-900">
                              {notification.title}
                            </p>
                            <p className="shrink-0 text-[11px] text-neutral-400">
                              {formatNotificationDate(notification.createdAt)}
                            </p>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[12px] text-neutral-500">
                            {notification.message}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="rounded-full bg-[#f2f6fb] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#56769f]">
                              {notification.category}
                            </span>
                            {notification.status === "UNREAD" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#1f5fa5]">
                                <Circle className="size-2 fill-current" />
                                New
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </Link>
                    {index < visibleNotifications.length - 1 ? (
                      <div className="mx-3 h-px bg-[#e8edf3]" />
                    ) : null}
                  </div>
                ))}
                <div className="px-2 pb-1 pt-2">
                  <Link
                    href={`/${orgSlug}/notifications`}
                    className="flex items-center justify-center rounded-xl border border-[#dce6f1] bg-[#fafcff] px-3 py-2 text-[12px] font-semibold text-[#365887] transition-colors hover:bg-[#f3f8fe]"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center">
                <p className="text-[13px] font-medium text-neutral-700">No notifications yet</p>
                <p className="mt-1 text-[12px] text-neutral-400">
                  New approvals and request updates will appear here automatically.
                </p>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <p className="text-[0.95rem] font-medium">{formattedDate}</p>
      </div>
    </div>
  );
}
