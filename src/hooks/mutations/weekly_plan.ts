"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { setWeeklyPlanDay } from "@/hooks/functions/weekly_plan";
import type { SetDayInput } from "@/types/weekly_plan";

export interface SetDayVariables {
  date:  string; // ISO "YYYY-MM-DD"
  input: SetDayInput;
}

export function useSetWeeklyPlanDayMutation(
  orgSlug: string,
  year: number,
  week: number,
) {
  const api         = useApiClient(orgSlug);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ date, input }: SetDayVariables) =>
      setWeeklyPlanDay(api!, date, input),
    onSuccess: () => {
      // Invalidate both my plan and team plan for the current week
      queryClient.invalidateQueries({
        queryKey: ["weekly-plan", "my", orgSlug, year, week],
      });
      queryClient.invalidateQueries({
        queryKey: ["weekly-plan", "team", orgSlug, year, week],
      });
    },
  });
}
