'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Bell, BriefcaseBusiness, CheckCheck, Circle, Inbox, MessageSquareMore, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationsQuery,
} from '@/modules/notifications/hooks/useNotifications';
import type { NotificationFilter, NotificationRecord } from '@/modules/notifications/types/notificationTypes';

function formatAbsolute(dateString: string) {
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

function formatRelative(dateString: string) {
  const value = new Date(dateString);
  if (Number.isNaN(value.getTime())) return dateString;

  const diffMs = value.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, 'hour');
  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, 'day');
}

function categoryLabel(category: string) {
  if (category === 'procurement') return 'Procurement';
  if (category === 'leave') return 'Leave';
  if (category === 'helpdesk') return 'Helpdesk';
  return category;
}

function NotificationIcon({ category }: Readonly<{ category: string }>) {
  if (category === 'procurement') {
    return <ShoppingBag className="size-4" />;
  }
  if (category === 'leave') {
    return <BriefcaseBusiness className="size-4" />;
  }
  if (category === 'helpdesk') {
    return <MessageSquareMore className="size-4" />;
  }
  return <Bell className="size-4" />;
}

function NotificationItem({
  notification,
  orgSlug,
  onRead,
}: Readonly<{
  notification: NotificationRecord;
  orgSlug: string;
  onRead: (notificationId: string) => void;
}>) {
  const href = notification.actionUrl || `/${orgSlug}/notifications`;
  const isUnread = notification.status === 'UNREAD';

  return (
    <Link
      href={href}
      onClick={() => {
        if (isUnread) onRead(notification.id);
      }}
      className={cn(
        'group block rounded-[22px] border px-4 py-4 transition-all',
        isUnread
          ? 'border-[#c8d7ea] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] shadow-[0_10px_30px_rgba(54,88,135,0.08)]'
          : 'border-[#e7edf4] bg-white hover:bg-[#fafcfe]',
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl border',
            isUnread
              ? 'border-[#bfd2ea] bg-[#eef6ff] text-[#2b5a91]'
              : 'border-[#e5ebf2] bg-[#f7f9fc] text-[#6f86a3]',
          )}
        >
          <NotificationIcon category={notification.category} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold text-neutral-900">{notification.title}</p>
            <Badge
              variant="outline"
              className="h-6 rounded-full border-[#d7e3f0] bg-[#f8fbff] px-2.5 text-[11px] font-medium text-[#44658f]"
            >
              {categoryLabel(notification.category)}
            </Badge>
            {isUnread ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ecf5ff] px-2 py-0.5 text-[11px] font-semibold text-[#1f5fa5]">
                <Circle className="size-2 fill-current" />
                Unread
              </span>
            ) : null}
          </div>

          <p className="mt-1.5 text-[13px] leading-6 text-neutral-600">{notification.message}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-neutral-400">
            <span>{formatRelative(notification.createdAt)}</span>
            <span>{formatAbsolute(notification.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function NotificationList({
  items,
  isLoading,
  error,
  emptyTitle,
  emptyBody,
  orgSlug,
  onRead,
}: Readonly<{
  items: NotificationRecord[];
  isLoading: boolean;
  error: string | null;
  emptyTitle: string;
  emptyBody: string;
  orgSlug: string;
  onRead: (notificationId: string) => void;
}>) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-[22px] border border-[#e7edf4] bg-white" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[24px] border border-[#f0d5d5] bg-[#fff7f7] px-5 py-10 text-center">
        <p className="text-sm font-semibold text-[#9f2f2f]">Could not load notifications</p>
        <p className="mt-2 text-sm text-[#b45858]">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-[#d6e1ee] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 py-12 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#f2f7fd] text-[#5277a7]">
          <Inbox className="size-6" />
        </div>
        <p className="mt-4 text-base font-semibold text-neutral-900">{emptyTitle}</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-neutral-500">{emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <NotificationItem key={item.id} notification={item} orgSlug={orgSlug} onRead={onRead} />
      ))}
    </div>
  );
}

export function NotificationsPageShell({
  orgSlug,
  memberId,
}: Readonly<{
  orgSlug: string;
  memberId: string;
}>) {
  const [activeTab, setActiveTab] = useState<NotificationFilter>('all');

  const allQuery = useNotificationsQuery(orgSlug, memberId, { status: 'all' });
  const unreadQuery = useNotificationsQuery(orgSlug, memberId, { status: 'unread', enabled: activeTab === 'unread' });
  const readQuery = useNotificationsQuery(orgSlug, memberId, { status: 'read', enabled: activeTab === 'read' });

  const markReadMutation = useMarkNotificationRead(orgSlug, memberId);
  const markAllReadMutation = useMarkAllNotificationsRead(orgSlug, memberId);

  const currentQuery = useMemo(() => {
    if (activeTab === 'unread') return unreadQuery;
    if (activeTab === 'read') return readQuery;
    return allQuery;
  }, [activeTab, allQuery, readQuery, unreadQuery]);

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-[30px] border border-[#dce7f3] bg-[radial-gradient(circle_at_top_left,#f3f8ff_0%,#ffffff_55%,#f9fbfe_100%)] px-6 py-6 shadow-[0_18px_48px_rgba(31,63,104,0.08)]">
        <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-[radial-gradient(circle,#dfeeff_0%,rgba(223,238,255,0)_72%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#5d7ea7]">Notification Center</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-900">Everything that needs your attention.</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-neutral-500">
              Procurement approvals, request decisions, and workflow updates now live in one inbox.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[170px] rounded-[22px] border border-[#d8e5f3] bg-white/90 px-4 py-3 shadow-[0_8px_24px_rgba(61,101,151,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a94b5]">Unread</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">{allQuery.data?.unreadCount ?? 0}</p>
            </div>
            <Button
              variant="outline"
              className="h-11 rounded-full border-[#d5e2f0] bg-white px-4 text-sm font-semibold text-[#355885]"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || (allQuery.data?.unreadCount ?? 0) === 0}
            >
              <CheckCheck className="size-4" />
              Mark all as read
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-[#e3ebf4] bg-white p-4 shadow-[0_10px_40px_rgba(15,23,42,0.04)] sm:p-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as NotificationFilter)} className="gap-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <TabsList variant="line" className="border-b border-[#e6edf5] px-0">
              <TabsTrigger value="all" className="px-1.5 sm:px-4">All</TabsTrigger>
              <TabsTrigger value="unread" className="px-1.5 sm:px-4">Unread</TabsTrigger>
              <TabsTrigger value="read" className="px-1.5 sm:px-4">Read</TabsTrigger>
            </TabsList>

            <p className="text-sm text-neutral-400">
              {currentQuery.data?.total ?? 0} notification{(currentQuery.data?.total ?? 0) === 1 ? '' : 's'}
            </p>
          </div>

          <TabsContent value="all" className="mt-1">
            <NotificationList
              items={allQuery.data?.items ?? []}
              isLoading={allQuery.isLoading}
              error={allQuery.error?.message ?? null}
              emptyTitle="No notifications yet"
              emptyBody="New procurement decisions and workflow alerts will appear here as they happen."
              orgSlug={orgSlug}
              onRead={(id) => markReadMutation.mutate(id)}
            />
          </TabsContent>

          <TabsContent value="unread" className="mt-1">
            <NotificationList
              items={unreadQuery.data?.items ?? []}
              isLoading={unreadQuery.isLoading}
              error={unreadQuery.error?.message ?? null}
              emptyTitle="Inbox cleared"
              emptyBody="You have read everything that was waiting for action."
              orgSlug={orgSlug}
              onRead={(id) => markReadMutation.mutate(id)}
            />
          </TabsContent>

          <TabsContent value="read" className="mt-1">
            <NotificationList
              items={readQuery.data?.items ?? []}
              isLoading={readQuery.isLoading}
              error={readQuery.error?.message ?? null}
              emptyTitle="No read notifications yet"
              emptyBody="Notifications you have already opened will collect here."
              orgSlug={orgSlug}
              onRead={(id) => markReadMutation.mutate(id)}
            />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
