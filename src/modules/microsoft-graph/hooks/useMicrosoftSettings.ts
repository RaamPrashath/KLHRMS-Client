"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMicrosoftSettingsAction,
  fetchMicrosoftSyncStatusAction,
  saveMicrosoftSettingsAction,
} from "@/modules/microsoft-graph/api/microsoftGraphServerActions";
import type { MicrosoftSettings } from "@/modules/microsoft-graph/types/microsoftGraphTypes";

export function useMicrosoftSettings(orgSlug: string, memberId: string) {
  return useQuery({
    queryKey: ["microsoft-settings", orgSlug],
    queryFn: () => fetchMicrosoftSettingsAction({ orgSlug, memberId }),
    staleTime: 30_000,
  });
}

export function useMicrosoftSyncStatus(orgSlug: string, memberId: string) {
  return useQuery({
    queryKey: ["microsoft-sync-status", orgSlug],
    queryFn: () => fetchMicrosoftSyncStatusAction({ orgSlug, memberId }),
    staleTime: 10_000,
  });
}

export function useSaveMicrosoftSettings(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { tenant_id: string; client_id: string; client_secret: string }) =>
      saveMicrosoftSettingsAction({ orgSlug, memberId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["microsoft-settings", orgSlug] });
      queryClient.invalidateQueries({ queryKey: ["microsoft-sync-status", orgSlug] });
    },
  });
}
