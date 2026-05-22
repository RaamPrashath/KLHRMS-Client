'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMyTicketsAction, type MyTicket } from '@/modules/assets/api/assetServerActions';

export function useMyTicketsQuery(orgSlug: string, memberId: string) {
  return useQuery<MyTicket[], Error>({
    queryKey: ['my-tickets', orgSlug],
    queryFn: () => fetchMyTicketsAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}
