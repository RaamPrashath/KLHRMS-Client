'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMaintenanceTicketsAction, type MaintenanceTicket } from '@/modules/assets/api/assetServerActions';

export function useMaintenanceTicketsQuery(orgSlug: string, memberId: string) {
  return useQuery<MaintenanceTicket[], Error>({
    queryKey: ['maintenance-tickets', orgSlug],
    queryFn: () => fetchMaintenanceTicketsAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}
