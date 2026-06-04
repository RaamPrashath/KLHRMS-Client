'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotificationsAction,
  fetchNotificationUnreadCountAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/modules/notifications/api/notificationServerActions';
import type {
  NotificationFilter,
  NotificationListResponse,
  NotificationUnreadCountResponse,
} from '@/modules/notifications/types/notificationTypes';

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: (orgSlug: string) => [...notificationKeys.all, 'list', orgSlug] as const,
  list: (orgSlug: string, status: NotificationFilter, limit: number, offset: number) =>
    [...notificationKeys.lists(orgSlug), status, limit, offset] as const,
  unreadCount: (orgSlug: string) => [...notificationKeys.all, 'unread-count', orgSlug] as const,
};

export function useNotificationsQuery(
  orgSlug: string,
  memberId: string,
  options?: {
    status?: NotificationFilter;
    limit?: number;
    offset?: number;
    enabled?: boolean;
  },
) {
  const status = options?.status ?? 'all';
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  return useQuery<NotificationListResponse, Error>({
    queryKey: notificationKeys.list(orgSlug, status, limit, offset),
    queryFn: () => fetchNotificationsAction({ orgSlug, memberId, status, limit, offset }),
    enabled: !!orgSlug && !!memberId && (options?.enabled ?? true),
    staleTime: 30_000,
  });
}

export function useNotificationUnreadCountQuery(orgSlug: string, memberId: string) {
  return useQuery<NotificationUnreadCountResponse, Error>({
    queryKey: notificationKeys.unreadCount(orgSlug),
    queryFn: () => fetchNotificationUnreadCountAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 15_000,
  });
}

function patchNotificationReadState(
  previous: NotificationListResponse | undefined,
  notificationId: string,
) {
  if (!previous) return previous;
  let changed = false;
  const items = previous.items.map((item) => {
    if (item.id !== notificationId || item.status === 'READ') return item;
    changed = true;
    return {
      ...item,
      status: 'READ' as const,
      readAt: new Date().toISOString(),
    };
  });

  if (!changed) return previous;

  return {
    ...previous,
    items,
    unreadCount: Math.max(0, previous.unreadCount - 1),
  };
}

function patchAllNotificationsRead(previous: NotificationListResponse | undefined) {
  if (!previous) return previous;
  return {
    ...previous,
    items: previous.items.map((item) => (
      item.status === 'READ'
        ? item
        : { ...item, status: 'READ' as const, readAt: new Date().toISOString() }
    )),
    unreadCount: 0,
  };
}

export function useMarkNotificationRead(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationReadAction({ orgSlug, memberId, notificationId }),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists(orgSlug) });
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount(orgSlug) });

      const snapshots = queryClient.getQueriesData<NotificationListResponse>({
        queryKey: notificationKeys.lists(orgSlug),
      });
      const unreadSnapshot = queryClient.getQueryData<NotificationUnreadCountResponse>(
        notificationKeys.unreadCount(orgSlug),
      );

      for (const [key, value] of snapshots) {
        queryClient.setQueryData(key, patchNotificationReadState(value, notificationId));
      }

      if (unreadSnapshot) {
        queryClient.setQueryData(notificationKeys.unreadCount(orgSlug), {
          unreadCount: Math.max(0, unreadSnapshot.unreadCount - 1),
        });
      }

      return { snapshots, unreadSnapshot };
    },
    onError: (_error, _notificationId, context) => {
      for (const [key, value] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, value);
      }
      if (context?.unreadSnapshot) {
        queryClient.setQueryData(notificationKeys.unreadCount(orgSlug), context.unreadSnapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists(orgSlug) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(orgSlug) });
    },
  });
}

export function useMarkAllNotificationsRead(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllNotificationsReadAction({ orgSlug, memberId }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.lists(orgSlug) });
      await queryClient.cancelQueries({ queryKey: notificationKeys.unreadCount(orgSlug) });

      const snapshots = queryClient.getQueriesData<NotificationListResponse>({
        queryKey: notificationKeys.lists(orgSlug),
      });
      const unreadSnapshot = queryClient.getQueryData<NotificationUnreadCountResponse>(
        notificationKeys.unreadCount(orgSlug),
      );

      for (const [key, value] of snapshots) {
        queryClient.setQueryData(key, patchAllNotificationsRead(value));
      }
      queryClient.setQueryData(notificationKeys.unreadCount(orgSlug), { unreadCount: 0 });

      return { snapshots, unreadSnapshot };
    },
    onError: (_error, _vars, context) => {
      for (const [key, value] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, value);
      }
      if (context?.unreadSnapshot) {
        queryClient.setQueryData(notificationKeys.unreadCount(orgSlug), context.unreadSnapshot);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists(orgSlug) });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(orgSlug) });
    },
  });
}
