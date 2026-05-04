"use client";

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import {
  fetchMyWeeklyPlan,
  fetchTeamWeeklyPlan,
} from "@/hooks/functions/weekly_plan";

export function useMyWeeklyPlanQuery(
  orgSlug: string,
  year: number,
  week: number,
) {
  const api = useApiClient(orgSlug);
  return useQuery({
    queryKey: ["weekly-plan", "my", orgSlug, year, week],
    queryFn:  () => fetchMyWeeklyPlan(api!, year, week),
    enabled:  !!api,
  });
}

export function useTeamWeeklyPlanQuery(
  orgSlug: string,
  year: number,
  week: number,
) {
  const api = useApiClient(orgSlug);
  return useQuery({
    queryKey: ["weekly-plan", "team", orgSlug, year, week],
    queryFn:  () => fetchTeamWeeklyPlan(api!, year, week),
    enabled:  !!api,
  });
}
