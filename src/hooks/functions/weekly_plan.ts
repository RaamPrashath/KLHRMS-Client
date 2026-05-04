// Pure async API call functions — no React, no hooks.
// Imported by query and mutation hooks.

import type { ApiClientInstance } from "@/lib/api-client";
import type { SetDayInput, WeeklyPlanEntry } from "@/types/weekly_plan";

export async function fetchMyWeeklyPlan(
  api: ApiClientInstance,
  year: number,
  week: number,
): Promise<WeeklyPlanEntry[]> {
  return api.get<WeeklyPlanEntry[]>("/weekly-plans", {
    params: { year, week },
  });
}

export async function fetchTeamWeeklyPlan(
  api: ApiClientInstance,
  year: number,
  week: number,
): Promise<WeeklyPlanEntry[]> {
  return api.get<WeeklyPlanEntry[]>("/weekly-plans/team", {
    params: { year, week },
  });
}

export async function setWeeklyPlanDay(
  api: ApiClientInstance,
  date: string, // ISO date "YYYY-MM-DD"
  body: SetDayInput,
): Promise<WeeklyPlanEntry> {
  return api.put<WeeklyPlanEntry>(`/weekly-plans/${date}`, body);
}
