"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getMonth, getYear, parseISO } from "date-fns";
import { toast } from "sonner";
import { useApiClient } from "@/hooks/useApiClient";
import {
  saveMonthlyPlan,
  saveWeeklyPlan,
  type PlanApiAuth,
  type WeeklyPlanDayInput,
  type WeeklyPlanEntry,
} from "@/hooks/functions/weekly_plan";
import { weeklyPlanKeys } from "@/hooks/queries/weekly_plan";

interface MutationContext {
  previousEntries?: WeeklyPlanEntry[];
}

function makePlanAuth(
  token: string | undefined,
  orgSlug: string,
  memberId: string,
): PlanApiAuth | null {
  if (!token || !orgSlug || !memberId) return null;
  return { token, orgSlug, memberId };
}

function applyPlanDrafts(
  existing: WeeklyPlanEntry[] | undefined,
  orgId: string,
  userId: string,
  days: WeeklyPlanDayInput[],
): WeeklyPlanEntry[] {
  const byDate = new Map((existing ?? []).map((entry) => [entry.date, entry]));

  for (const day of days) {
    if (!day.work_location) {
      byDate.delete(day.date);
      continue;
    }

    const previous = byDate.get(day.date);
    byDate.set(day.date, {
      id: previous?.id ?? `draft-${day.date}`,
      organization_id: previous?.organization_id ?? orgId,
      user_id: previous?.user_id ?? userId,
      user_name: previous?.user_name ?? null,
      date: day.date,
      work_location: day.work_location,
      project: day.project ?? null,
    });
  }

  return Array.from(byDate.values()).sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

function getTouchedMonths(days: WeeklyPlanDayInput[]) {
  return Array.from(
    new Set(
      days.map((day) => {
        const parsed = parseISO(day.date);
        return `${getYear(parsed)}-${getMonth(parsed) + 1}`;
      }),
    ),
  ).map((value) => {
    const [year, month] = value.split("-");
    return { year: Number(year), month: Number(month) };
  });
}

export function useSaveWeeklyPlanMutation(
  orgSlug: string,
  orgId: string,
  memberId: string,
  userId: string,
  year: number,
  week: number,
) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (days: WeeklyPlanDayInput[]) =>
      saveWeeklyPlan(makePlanAuth(auth?.token, orgSlug, memberId)!, year, week, days),
    onMutate: async (days): Promise<MutationContext> => {
      await queryClient.cancelQueries({
        queryKey: weeklyPlanKeys.myWeek(orgSlug, year, week),
      });

      const previousEntries = queryClient.getQueryData<WeeklyPlanEntry[]>(
        weeklyPlanKeys.myWeek(orgSlug, year, week),
      );

      queryClient.setQueryData<WeeklyPlanEntry[]>(
        weeklyPlanKeys.myWeek(orgSlug, year, week),
        (current) => applyPlanDrafts(current, orgId, userId, days),
      );

      return { previousEntries };
    },
    onError: (error, _days, context) => {
      queryClient.setQueryData(
        weeklyPlanKeys.myWeek(orgSlug, year, week),
        context?.previousEntries,
      );
      const message =
        error instanceof Error ? error.message : "Failed to save weekly plan";
      toast.error(message);
    },
    onSuccess: (entries, days) => {
      queryClient.setQueryData(weeklyPlanKeys.myWeek(orgSlug, year, week), entries);
      queryClient.invalidateQueries({
        queryKey: weeklyPlanKeys.teamWeek(orgSlug, year, week),
      });
      for (const touched of getTouchedMonths(days)) {
        queryClient.invalidateQueries({
          queryKey: weeklyPlanKeys.myMonth(orgSlug, touched.year, touched.month),
        });
      }
    },
  });
}

export function useSaveMonthlyPlanMutation(
  orgSlug: string,
  orgId: string,
  memberId: string,
  userId: string,
  year: number,
  month: number,
) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (days: WeeklyPlanDayInput[]) =>
      saveMonthlyPlan(makePlanAuth(auth?.token, orgSlug, memberId)!, year, month, days),
    onMutate: async (days): Promise<MutationContext> => {
      await queryClient.cancelQueries({
        queryKey: weeklyPlanKeys.myMonth(orgSlug, year, month),
      });

      const previousEntries = queryClient.getQueryData<WeeklyPlanEntry[]>(
        weeklyPlanKeys.myMonth(orgSlug, year, month),
      );

      queryClient.setQueryData<WeeklyPlanEntry[]>(
        weeklyPlanKeys.myMonth(orgSlug, year, month),
        (current) => applyPlanDrafts(current, orgId, userId, days),
      );

      return { previousEntries };
    },
    onError: (error, _days, context) => {
      queryClient.setQueryData(
        weeklyPlanKeys.myMonth(orgSlug, year, month),
        context?.previousEntries,
      );
      const message =
        error instanceof Error ? error.message : "Failed to save monthly plan";
      toast.error(message);
    },
    onSuccess: (entries) => {
      queryClient.setQueryData(weeklyPlanKeys.myMonth(orgSlug, year, month), entries);
    },
  });
}
