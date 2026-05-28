'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchProcurementAdminRecipientsAction,
  fetchProcurementListAction,
  fetchProcurementMetaAction,
  fetchProcurementPurchaseOrdersAction,
  fetchProcurementPurchaseOrderDraftAction,
  fetchProcurementPurchaseOrderTemplateAction,
} from '@/modules/procurement/api/procurementServerActions';
import type {
  ProcurementAdminRecipientsResponse,
  ProcurementListResponse,
  ProcurementMetaResponse,
  ProcurementPurchaseOrderListResponse,
  ProcurementPurchaseOrderDraftResponse,
  ProcurementPurchaseOrderTemplateRecord,
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

export function useProcurementPurchaseOrdersQuery(orgSlug: string, memberId: string, enabled = true) {
  return useQuery<ProcurementPurchaseOrderListResponse, Error>({
    queryKey: ['procurement-po-list', orgSlug],
    queryFn: () => fetchProcurementPurchaseOrdersAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId && enabled,
  });
}

export function useProcurementPurchaseOrderDraftQuery(
  orgSlug: string,
  memberId: string,
  requisitionId: string,
) {
  return useQuery<ProcurementPurchaseOrderDraftResponse, Error>({
    queryKey: ['procurement-po-draft', orgSlug, requisitionId],
    queryFn: () => fetchProcurementPurchaseOrderDraftAction({ orgSlug, memberId, requisitionId }),
    enabled: !!orgSlug && !!memberId && !!requisitionId,
  });
}

export function useProcurementPurchaseOrderTemplateQuery(orgSlug: string, memberId: string, enabled = true) {
  return useQuery<ProcurementPurchaseOrderTemplateRecord, Error>({
    queryKey: ['procurement-po-template', orgSlug],
    queryFn: () => fetchProcurementPurchaseOrderTemplateAction({ orgSlug, memberId }),
    enabled: !!orgSlug && !!memberId && enabled,
  });
}
