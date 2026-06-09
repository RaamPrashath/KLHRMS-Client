'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMyTicketsAction, type MyTicket } from '@/modules/assets/api/assetServerActions';
import type { HelpdeskTicket } from '@/modules/helpdesk/types/helpdeskTypes';
import { humanize } from '@/modules/assets/lib/assetUtils';

function normalizeTicket(ticket: MyTicket): HelpdeskTicket {
  const isAssetIssue = ticket.ticketMode === 'ASSET_ISSUE';
  return {
    id: ticket.id,
    ticketId: ticket.ticketId ?? ticket.id,
    kind: ticket.ticketMode === 'ASSET_ISSUE' ? 'ASSET_ISSUE' : 'GENERAL_HELP',
    subject: ticket.subject ?? (isAssetIssue ? 'Asset request' : 'General help request'),
    description: ticket.issueDescription ?? '',
    status: ticket.status ?? 'OPEN',
    priority: isAssetIssue ? 'MEDIUM' : 'MEDIUM',
    categoryName: ticket.category ?? null,
    assetId: ticket.assetId ?? null,
    assetName: ticket.assetName ?? null,
    assetCode: ticket.assetCode ?? null,
    maintenanceType: ticket.maintenanceType ?? null,
    createdAt: ticket.createdAt ?? new Date().toISOString(),
  };
}

export function useHelpdeskTicketsQuery(orgSlug: string, memberId: string) {
  return useQuery<HelpdeskTicket[], Error>({
    queryKey: ['my-tickets', orgSlug],
    queryFn: async () => {
      const tickets = await fetchMyTicketsAction({ orgSlug, memberId });
      return tickets
        .map(normalizeTicket)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    },
    enabled: !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}
