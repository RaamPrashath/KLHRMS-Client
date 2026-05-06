"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import {
  fetchMyMonthlyPlan,
  fetchMyWeeklyPlan,
  fetchPlanLocations,
  fetchTeamWeeklyPlan,
  type PlanApiAuth,
} from "@/hooks/functions/weekly_plan";
import { FALLBACK_PLAN_LOCATIONS } from "@/modules/weekly-plan/locations";

export const weeklyPlanKeys = {
  all: ["weekly_plan"] as const,
  locations: (orgSlug: string) =>
    [...weeklyPlanKeys.all, "locations", orgSlug] as const,
  myWeek: (orgSlug: string, year: number, week: number) =>
    [...weeklyPlanKeys.all, "my-week", orgSlug, year, week] as const,
  teamWeek: (orgSlug: string, year: number, week: number) =>
    [...weeklyPlanKeys.all, "team-week", orgSlug, year, week] as const,
  myMonth: (orgSlug: string, year: number, month: number) =>
    [...weeklyPlanKeys.all, "my-month", orgSlug, year, month] as const,
};

function makePlanAuth(
  token: string | undefined,
  orgSlug: string,
  memberId: string,
): PlanApiAuth | null {
  if (!token || !orgSlug || !memberId) return null;
  return { token, orgSlug, memberId };
}

export function getPlanLocationsQueryOptions(auth: PlanApiAuth | null, orgSlug: string) {
  return {
    queryKey: weeklyPlanKeys.locations(orgSlug),
    queryFn: async () => {
      if (!auth) return FALLBACK_PLAN_LOCATIONS;
      return fetchPlanLocations(auth).catch(() => FALLBACK_PLAN_LOCATIONS);
    },
    enabled: !!orgSlug,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  } as const;
}

export function getMyWeeklyPlanQueryOptions(
  auth: PlanApiAuth | null,
  orgSlug: string,
  year: number,
  week: number,
) {
  return {
    queryKey: weeklyPlanKeys.myWeek(orgSlug, year, week),
    queryFn: () => fetchMyWeeklyPlan(auth!, year, week),
    enabled: !!auth,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  } as const;
}

export function getTeamWeeklyPlanQueryOptions(
  auth: PlanApiAuth | null,
  orgSlug: string,
  year: number,
  week: number,
) {
  return {
    queryKey: weeklyPlanKeys.teamWeek(orgSlug, year, week),
    queryFn: () => fetchTeamWeeklyPlan(auth!, year, week),
    enabled: !!auth,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  } as const;
}

export function getMyMonthlyPlanQueryOptions(
  auth: PlanApiAuth | null,
  orgSlug: string,
  year: number,
  month: number,
) {
  return {
    queryKey: weeklyPlanKeys.myMonth(orgSlug, year, month),
    queryFn: () => fetchMyMonthlyPlan(auth!, year, month),
    enabled: !!auth,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 45,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  } as const;
}

export function usePlanLocationsQuery(orgSlug: string, orgId: string, memberId: string) {
  const auth = useApiClient(orgId);
  return useQuery(
    getPlanLocationsQueryOptions(
      makePlanAuth(auth?.token, orgSlug, memberId),
      orgSlug,
    ),
  );
}

export function useMyWeeklyPlanQuery(
  orgSlug: string,
  orgId: string,
  memberId: string,
  year: number,
  week: number,
) {
  const auth = useApiClient(orgId);
  return useQuery(
    getMyWeeklyPlanQueryOptions(
      makePlanAuth(auth?.token, orgSlug, memberId),
      orgSlug,
      year,
      week,
    ),
  );
}

export function useTeamWeeklyPlanQuery(
  orgSlug: string,
  orgId: string,
  memberId: string,
  year: number,
  week: number,
  enabled = true,
) {
  const auth = useApiClient(orgId);
  return useQuery(
    {
      ...getTeamWeeklyPlanQueryOptions(
        makePlanAuth(auth?.token, orgSlug, memberId),
        orgSlug,
        year,
        week,
      ),
      enabled: enabled && !!auth,
    },
  );
}

export function useMyMonthlyPlanQuery(
  orgSlug: string,
  orgId: string,
  memberId: string,
  year: number,
  month: number,
) {
  const auth = useApiClient(orgId);
  return useQuery(
    getMyMonthlyPlanQueryOptions(
      makePlanAuth(auth?.token, orgSlug, memberId),
      orgSlug,
      year,
      month,
    ),
  );
}
