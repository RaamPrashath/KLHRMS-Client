'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchArchivedTicketsAction, type MaintenanceTicket } from '@/modules/assets/api/assetServerActions';

export function useArchivedTicketsQuery(
  orgSlug: string,
  memberId: string,
  ticketMode?: string,
  options?: { enabled?: boolean },
) {
  return useQuery<MaintenanceTicket[], Error>({
    queryKey: ['archived-tickets', orgSlug, ticketMode],
    queryFn: async () => {
      const tickets = await fetchArchivedTicketsAction({ orgSlug, memberId });
      if (ticketMode) {
        return tickets.filter((t) => t.ticketMode === ticketMode);
      }
      return tickets;
    },
    enabled: (options?.enabled ?? true) && !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}
