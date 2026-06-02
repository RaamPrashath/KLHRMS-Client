'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMyTicketsAction, type MyTicket } from '@/modules/assets/api/assetServerActions';
export type { MyTicket };

export function useMyTicketsQuery(orgSlug: string, memberId: string, options?: { enabled?: boolean }) {
  return useQuery<MyTicket[], Error>({
    queryKey: ['my-tickets', orgSlug],
    queryFn: () => fetchMyTicketsAction({ orgSlug, memberId }),
    enabled: (options?.enabled ?? true) && !!orgSlug && !!memberId,
    staleTime: 1000 * 60 * 2,
  });
}
