'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMyTicketsAction } from '@/modules/assets/api/assetServerActions';

export interface MyTicket {
  id: string;
  assetId: string;
  assetName: string;
  assetCode: string;
  maintenanceType: string;
  issueDescription: string;
  status: string;
  serviceDate: string;
  createdAt: string;
}

export function useMyTicketsQuery(orgSlug: string, memberId: string) {
  return useQuery<MyTicket[], Error>({
    queryKey: ['my-tickets', orgSlug],
    queryFn: () => fetchMyTicketsAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}
