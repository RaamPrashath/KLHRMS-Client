'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import type {
  NotificationFilter,
  NotificationListResponse,
  NotificationMarkAllReadResponse,
  NotificationRecord,
  NotificationUnreadCountResponse,
} from '@/modules/notifications/types/notificationTypes';

function getApiUrl(): string {
  const url = process.env.HRMS_API_URL;
  if (!url) throw new Error('HRMS_API_URL environment variable is not set');
  return url;
}

function buildHeaders(orgSlug: string, memberId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-organization-slug': orgSlug,
    'x-membership-id': memberId,
  };
}

async function getCurrentOrgMember(orgSlug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error(JSON.stringify({ status: 401, message: 'Unauthorized' }));
  }
  return requireOrgMembership(session.user.id, orgSlug);
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  let message = `Request failed with status ${res.status}`;
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') message = body.detail;
    else if (typeof body?.message === 'string') message = body.message;
  } catch {
    // ignore
  }

  throw new Error(JSON.stringify({ status: res.status, message }));
}

export async function fetchNotificationsAction(params: {
  orgSlug: string;
  memberId: string;
  status?: NotificationFilter;
  limit?: number;
  offset?: number;
}): Promise<NotificationListResponse> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const search = new URLSearchParams({
    status: params.status ?? 'all',
    limit: String(params.limit ?? 50),
    offset: String(params.offset ?? 0),
  });
  const res = await fetch(`${getApiUrl()}/notifications?${search.toString()}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<NotificationListResponse>(res);
}

export async function fetchNotificationUnreadCountAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<NotificationUnreadCountResponse> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/notifications/unread-count`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<NotificationUnreadCountResponse>(res);
}

export async function markNotificationReadAction(params: {
  orgSlug: string;
  memberId: string;
  notificationId: string;
}): Promise<NotificationRecord> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/notifications/${params.notificationId}/read`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
  });
  return handleResponse<NotificationRecord>(res);
}

export async function markAllNotificationsReadAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<NotificationMarkAllReadResponse> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/notifications/read-all`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
  });
  return handleResponse<NotificationMarkAllReadResponse>(res);
}
