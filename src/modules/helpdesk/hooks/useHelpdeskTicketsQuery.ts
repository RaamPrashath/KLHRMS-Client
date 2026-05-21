'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMyTicketsAction } from '@/modules/assets/api/assetServerActions';
import { fetchMyGeneralHelpTicketsAction } from '@/modules/helpdesk/api/helpdeskServerActions';
import type { HelpdeskTicket } from '@/modules/helpdesk/types/helpdeskTypes';

export function useHelpdeskTicketsQuery(orgSlug: string, memberId: string) {
  return useQuery<HelpdeskTicket[], Error>({
    queryKey: ['helpdesk-tickets', orgSlug, memberId],
    queryFn: async () => {
      const [assetTickets, generalTickets] = await Promise.all([
        fetchMyTicketsAction({ orgSlug, memberId }),
        fetchMyGeneralHelpTicketsAction({ orgSlug, memberId }),
      ]);

      return [
        ...assetTickets
          .filter((t) => t.ticketMode === 'ASSET_ISSUE')
          .map<HelpdeskTicket>((ticket) => ({
            id: ticket.id,
            ticketId: ticket.ticketId,
            kind: 'ASSET_ISSUE',
            subject: ticket.assetName ?? 'Asset issue',
            description: ticket.issueDescription,
            status: ticket.status,
            priority: 'MEDIUM',
            categoryName: ticket.maintenanceType,
            assetId: ticket.assetId,
            assetName: ticket.assetName ?? null,
            assetCode: ticket.assetCode ?? null,
            createdAt: ticket.createdAt,
          })),
        ...generalTickets,
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}
