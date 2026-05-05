"use client";

/**
 * leave — Layer 2a query hooks.
 */

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import {
  fetchLeaveTypes,
  fetchLeaveRequests,
  fetchLeaveBalances,
  fetchCalendarEvents,
  fetchHolidays,
  fetchAllLeaveTypes,
  fetchOrgMembers,
} from "@/hooks/functions/leave";
import type { LeaveStatus } from "@/hooks/functions/leave";

// ── Query key factories ───────────────────────────────────────────────────────

export const LEAVE_TYPES_KEY = (orgSlug: string) =>
  ["leaves", "types", orgSlug] as const;

export const LEAVE_ALL_TYPES_KEY = (orgSlug: string) =>
  ["leaves", "types", "all", orgSlug] as const;

export const LEAVE_REQUESTS_KEY = (
  orgSlug: string,
  status?: LeaveStatus,
) => ["leaves", "requests", orgSlug, status ?? "all"] as const;

export const LEAVE_BALANCES_KEY = (
  orgSlug: string,
  employeeId?: string,
  year?: number,
) => ["leaves", "balances", orgSlug, employeeId ?? "me", year ?? "all"] as const;

export const CALENDAR_EVENTS_KEY = (
  orgSlug: string,
  dateFrom: string,
  dateTo: string,
) => ["leaves", "calendar", orgSlug, dateFrom, dateTo] as const;

export const HOLIDAYS_KEY = (orgSlug: string) =>
  ["leaves", "holidays", orgSlug] as const;

export const ORG_MEMBERS_KEY = (orgSlug: string) =>
  ["leaves", "members", orgSlug] as const;

// 5 minutes — data stays fresh across tab switches
const STALE_TIME = 5 * 60 * 1000;

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useLeaveTypesQuery(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  return useQuery({
    queryKey: LEAVE_TYPES_KEY(orgSlug),
    queryFn: () => fetchLeaveTypes(auth!.token, auth!.orgId),
    enabled: !!auth,
    staleTime: STALE_TIME,
  });
}

export function useAllLeaveTypesQuery(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  return useQuery({
    queryKey: LEAVE_ALL_TYPES_KEY(orgSlug),
    queryFn: () => fetchAllLeaveTypes(auth!.token, auth!.orgId),
    enabled: !!auth,
    staleTime: STALE_TIME,
  });
}

export function useLeaveRequestsQuery(
  orgSlug: string,
  orgId: string,
  status?: LeaveStatus,
) {
  const auth = useApiClient(orgId);
  return useQuery({
    queryKey: LEAVE_REQUESTS_KEY(orgSlug, status),
    queryFn: () => fetchLeaveRequests(auth!.token, auth!.orgId, status),
    enabled: !!auth,
    staleTime: STALE_TIME,
  });
}

export function useLeaveBalancesQuery(
  orgSlug: string,
  orgId: string,
  employeeId?: string,
  year?: number,
) {
  const auth = useApiClient(orgId);
  return useQuery({
    queryKey: LEAVE_BALANCES_KEY(orgSlug, employeeId, year),
    queryFn: () => fetchLeaveBalances(auth!.token, auth!.orgId, employeeId, year),
    enabled: !!auth,
    staleTime: STALE_TIME,
  });
}

export function useCalendarEventsQuery(
  orgSlug: string,
  orgId: string,
  dateFrom: string,
  dateTo: string,
) {
  const auth = useApiClient(orgId);
  return useQuery({
    queryKey: CALENDAR_EVENTS_KEY(orgSlug, dateFrom, dateTo),
    enabled: !!auth,
    queryFn: () => fetchCalendarEvents(auth!.token, auth!.orgId, dateFrom, dateTo),
    staleTime: STALE_TIME,
  });
}

export function useHolidaysQuery(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  return useQuery({
    queryKey: HOLIDAYS_KEY(orgSlug),
    queryFn: () => fetchHolidays(auth!.token, auth!.orgId),
    enabled: !!auth,
    staleTime: STALE_TIME,
  });
}

export function useOrgMembersQuery(orgSlug: string, orgId: string) {
  const auth = useApiClient(orgId);
  return useQuery({
    queryKey: ORG_MEMBERS_KEY(orgSlug),
    queryFn: () => fetchOrgMembers(auth!.token, auth!.orgId),
    enabled: !!auth,
    staleTime: STALE_TIME,
  });
}