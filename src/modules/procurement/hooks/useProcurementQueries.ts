'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchProcurementAdminRecipientsAction,
  fetchProcurementListAction,
  fetchProcurementMetaAction,
} from '@/modules/procurement/api/procurementServerActions';
import type {
  ProcurementAdminRecipientsResponse,
  ProcurementListResponse,
  ProcurementMetaResponse,
} from '@/modules/procurement/types/procurementTypes';

export function useProcurementMetaQuery(orgSlug: string, memberId: string) {
  return useQuery<ProcurementMetaResponse, Error>({
    queryKey: ['procurement-meta', orgSlug],
    queryFn: () => fetchProcurementMetaAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
  });
}

export function useProcurementListQuery(orgSlug: string, memberId: string) {
  return useQuery<ProcurementListResponse, Error>({
    queryKey: ['procurement-list', orgSlug],
    queryFn: () => fetchProcurementListAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId,
  });
}

export function useProcurementAdminRecipientsQuery(
  orgSlug: string,
  memberId: string,
  enabled: boolean,
) {
  return useQuery<ProcurementAdminRecipientsResponse, Error>({
    queryKey: ['procurement-admin-recipients', orgSlug],
    queryFn: () => fetchProcurementAdminRecipientsAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId && enabled,
  });
}
