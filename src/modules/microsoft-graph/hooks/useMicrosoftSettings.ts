"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchMicrosoftSettingsAction,
  fetchMicrosoftSyncStatusAction,
} from "@/modules/microsoft-graph/api/microsoftGraphServerActions";

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
