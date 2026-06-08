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
        'group flex items-start gap-4 rounded-xl border p-4 transition-all duration-200 shadow-xs',
        isUnread
          ? 'border-primary/20 bg-primary/[0.02] hover:bg-primary/[0.04] dark:bg-primary/[0.02]'
          : 'border-border bg-card hover:bg-muted/40',
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border',
          isUnread
            ? 'border-primary/20 bg-primary/10 text-primary'
            : 'border-border bg-muted text-muted-foreground',
        )}
      >
        <NotificationIcon category={notification.category} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{notification.title}</p>
          <Badge
            variant="outline"
            className="h-5 rounded-md border-border bg-muted/40 px-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider"
          >
            {categoryLabel(notification.category)}
          </Badge>
          {isUnread ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <Circle className="size-1.5 fill-current" />
              New
            </span>
          ) : null}
        </div>

        <p className="mt-1 text-sm text-muted-foreground leading-normal">{notification.message}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80">
          <span>{formatRelative(notification.createdAt)}</span>
          <span className="text-muted-foreground/30">•</span>
          <span>{formatAbsolute(notification.createdAt)}</span>
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
          <div key={item} className="h-24 animate-pulse rounded-xl border border-border bg-card/60" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive-border bg-destructive-bg px-5 py-8 text-center text-destructive-text">
        <p className="text-sm font-semibold">Could not load notifications</p>
        <p className="mt-1 text-xs">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-16 text-center shadow-xs">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Inbox className="size-5" />
        </div>
        <p className="mt-4 text-sm font-semibold text-foreground">{emptyTitle}</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-normal text-muted-foreground">{emptyBody}</p>
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
    <div className="mx-7 mt-7 mb-7 flex flex-col gap-6 flex-1 min-h-full">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          Notification Center
        </h1>
        <p className="text-sm text-muted-foreground">
          Procurement approvals, request decisions, and workflow updates now live in one inbox.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as NotificationFilter)} className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-1">
          <TabsList variant="line" className="bg-transparent border-none">
            <TabsTrigger value="all" className="px-3 sm:px-4 text-sm font-medium">All</TabsTrigger>
            <TabsTrigger value="unread" className="px-3 sm:px-4 text-sm font-medium gap-1.5">
              Unread
              {allQuery.data?.unreadCount && allQuery.data.unreadCount > 0 ? (
                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  {allQuery.data.unreadCount}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="read" className="px-3 sm:px-4 text-sm font-medium">Read</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              {currentQuery.data?.total ?? 0} notification{(currentQuery.data?.total ?? 0) === 1 ? '' : 's'}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-lg text-xs font-semibold gap-1.5"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending || (allQuery.data?.unreadCount ?? 0) === 0}
            >
              <CheckCheck className="size-3.5" />
              Mark all as read
            </Button>
          </div>
        </div>

        <TabsContent value="all" className="mt-1 outline-none">
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

        <TabsContent value="unread" className="mt-1 outline-none">
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

        <TabsContent value="read" className="mt-1 outline-none">
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
    </div>
  );
}
