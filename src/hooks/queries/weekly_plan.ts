"use client";

/**
 * weekly_plan — Layer 2a query hooks.
 *
 * orgSlug  — used only in the query key (for cache scoping)
 * orgId    — the org UUID sent to FastAPI via x-organization-id header
 */

import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import {
  fetchMyWeeklyPlan,
  fetchTeamWeeklyPlan,
} from "@/hooks/functions/weekly_plan";

// ── Query key factories ───────────────────────────────────────────────────────

export const WEEKLY_PLAN_MY_KEY = (
  orgSlug: string,
  year: number,
  week: number,
) => ["weekly_plan", "my", orgSlug, year, week] as const;

export const WEEKLY_PLAN_TEAM_KEY = (
  orgSlug: string,
  year: number,
  week: number,
) => ["weekly_plan", "team", orgSlug, year, week] as const;

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useMyWeeklyPlanQuery(
  orgSlug: string,
  orgId: string,
  year: number,
  week: number,
) {
  const auth = useApiClient(orgId);
  return useQuery({
    queryKey: WEEKLY_PLAN_MY_KEY(orgSlug, year, week),
    queryFn: () => fetchMyWeeklyPlan(auth!.token, auth!.orgId, year, week),
    enabled: !!auth,
  });
}

export function useTeamWeeklyPlanQuery(
  orgSlug: string,
  orgId: string,
  year: number,
  week: number,
) {
  const auth = useApiClient(orgId);
  return useQuery({
    queryKey: WEEKLY_PLAN_TEAM_KEY(orgSlug, year, week),
    queryFn: () => fetchTeamWeeklyPlan(auth!.token, auth!.orgId, year, week),
    enabled: !!auth,
  });
}
