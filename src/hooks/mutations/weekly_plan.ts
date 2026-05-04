"use client";

/**
 * weekly_plan — Layer 2b mutation hooks.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApiClient } from "@/hooks/useApiClient";
import { setWeeklyPlanDay } from "@/hooks/functions/weekly_plan";
import {
  WEEKLY_PLAN_MY_KEY,
  WEEKLY_PLAN_TEAM_KEY,
} from "@/hooks/queries/weekly_plan";
import type { SetDayInput } from "@/hooks/functions/weekly_plan";

export interface SetDayVariables {
  date: string; // ISO "YYYY-MM-DD"
  input: SetDayInput;
}

export function useSetWeeklyPlanDayMutation(
  orgSlug: string,
  orgId: string,
  year: number,
  week: number,
) {
  const auth = useApiClient(orgId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, input }: SetDayVariables) =>
      setWeeklyPlanDay(auth!.token, auth!.orgId, date, input),
    // No onSuccess toast here — the caller (handleSave) shows a single toast
    // after all days are saved via Promise.all.
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: WEEKLY_PLAN_MY_KEY(orgSlug, year, week),
      });
      queryClient.invalidateQueries({
        queryKey: WEEKLY_PLAN_TEAM_KEY(orgSlug, year, week),
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Failed to save plan";
      toast.error(message);
    },
  });
}
