'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMaintenanceTicketsAction, type MaintenanceTicket } from '@/modules/assets/api/assetServerActions';
import { humanize } from '@/modules/assets/lib/assetUtils';

export function useHelpdeskAdminTicketsQuery(
  orgSlug: string,
  memberId: string,
  options?: { enabled?: boolean },
) {
  return useQuery<MaintenanceTicket[], Error>({
    queryKey: ['helpdesk-admin-tickets', orgSlug],
    queryFn: async () => {
      const tickets = await fetchMaintenanceTicketsAction({ orgSlug, memberId });
      return tickets
        .filter((ticket) => ticket.ticketMode === 'GENERAL_HELP_REQUEST')
        .map<MaintenanceTicket>((ticket) => ({
          ...ticket,
          assetId: null,
          assetUnitId: null,
          assetName: ticket.subject ?? ticket.assetName ?? 'General help request',
          assetCode: ticket.ticketId,
          assetCondition: null,
          maintenanceType: ticket.category ?? ticket.maintenanceType ?? 'GENERAL',
          assetLifecycleStatus: ticket.status,
          assetLifecycleStatusLabel: humanize(ticket.category ?? ticket.status),
          replacementDecision: null,
          swapPreview: null,
        }));
    },
    enabled: (options?.enabled ?? true) && !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}
