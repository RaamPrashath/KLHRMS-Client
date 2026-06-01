"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  syncMicrosoftEmployeesAction,
} from "@/modules/microsoft-graph/api/microsoftGraphServerActions";

export function useSyncEmployees(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => syncMicrosoftEmployeesAction({ orgSlug, memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["microsoft-sync-status", orgSlug] });
    },
  });
}
