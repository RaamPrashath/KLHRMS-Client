'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  approveProcurementAction,
  cancelProcurementAction,
  createBulkProcurementAction,
  createReplacementProcurementAction,
  issueProcurementPurchaseOrderAction,
  rejectProcurementAction,
  submitProcurementAction,
} from '@/modules/procurement/api/procurementServerActions';
import type {
  BulkProcurementInput,
  ProcurementDecisionInput,
  ProcurementPurchaseOrderInput,
  ReplacementProcurementInput,
} from '@/modules/procurement/schema/procurementSchemas';

function invalidateProcurement(queryClient: ReturnType<typeof useQueryClient>, orgSlug: string) {
  queryClient.invalidateQueries({ queryKey: ['procurement-list', orgSlug] });
  queryClient.invalidateQueries({ queryKey: ['procurement-meta', orgSlug] });
  queryClient.invalidateQueries({ queryKey: ['procurement-admin-recipients', orgSlug] });
}

export function useProcurementMutations(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  return {
    createBulk: useMutation({
      mutationFn: (data: BulkProcurementInput) => createBulkProcurementAction({ orgSlug, memberId, data }),
      onSuccess: () => invalidateProcurement(queryClient, orgSlug),
    }),
    createReplacement: useMutation({
      mutationFn: (data: ReplacementProcurementInput) =>
        createReplacementProcurementAction({ orgSlug, memberId, data }),
      onSuccess: () => invalidateProcurement(queryClient, orgSlug),
    }),
    submit: useMutation({
      mutationFn: (requisitionId: string) => submitProcurementAction({ orgSlug, memberId, requisitionId }),
      onSuccess: () => invalidateProcurement(queryClient, orgSlug),
    }),
    approve: useMutation({
      mutationFn: (params: { requisitionId: string; data: ProcurementDecisionInput }) =>
        approveProcurementAction({ orgSlug, memberId, ...params }),
      onSuccess: () => invalidateProcurement(queryClient, orgSlug),
    }),
    reject: useMutation({
      mutationFn: (params: { requisitionId: string; data: ProcurementDecisionInput }) =>
        rejectProcurementAction({ orgSlug, memberId, ...params }),
      onSuccess: () => invalidateProcurement(queryClient, orgSlug),
    }),
    cancel: useMutation({
      mutationFn: (requisitionId: string) => cancelProcurementAction({ orgSlug, memberId, requisitionId }),
      onSuccess: () => invalidateProcurement(queryClient, orgSlug),
    }),
    issuePurchaseOrder: useMutation({
      mutationFn: (params: { requisitionId: string; data: ProcurementPurchaseOrderInput }) =>
        issueProcurementPurchaseOrderAction({ orgSlug, memberId, ...params }),
      onSuccess: () => invalidateProcurement(queryClient, orgSlug),
    }),
  };
}
