'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMaintenanceTicketsAction, type MaintenanceTicket } from '@/modules/assets/api/assetServerActions';

export function useMaintenanceTicketsQuery(orgSlug: string, memberId: string, options?: { enabled?: boolean }) {
  return useQuery<MaintenanceTicket[], Error>({
    queryKey: ['maintenance-tickets', orgSlug],
    queryFn: () => fetchMaintenanceTicketsAction({ orgSlug, memberId }),
    enabled: (options?.enabled ?? true) && !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}
