'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  approveProcurementAction,
  cancelProcurementAction,
  createBulkProcurementAction,
  createReplacementProcurementAction,
  fetchProcurementPurchaseOrderDownloadAction,
  issueProcurementPurchaseOrderAction,
  previewProcurementPurchaseOrderAction,
  rejectProcurementAction,
  saveProcurementPurchaseOrderTemplateAction,
  sendProcurementPurchaseOrderEmailAction,
  submitProcurementAction,
} from '@/modules/procurement/api/procurementServerActions';
import type {
  BulkProcurementInput,
  ProcurementDecisionInput,
  ProcurementPurchaseOrderInput,
  ProcurementPurchaseOrderTemplateInput,
  ReplacementProcurementInput,
} from '@/modules/procurement/schema/procurementSchemas';

function invalidateProcurement(queryClient: ReturnType<typeof useQueryClient>, orgSlug: string) {
  queryClient.invalidateQueries({ queryKey: ['procurement-list', orgSlug] });
  queryClient.invalidateQueries({ queryKey: ['procurement-meta', orgSlug] });
  queryClient.invalidateQueries({ queryKey: ['procurement-admin-recipients', orgSlug] });
  queryClient.invalidateQueries({ queryKey: ['procurement-po-draft', orgSlug] });
  queryClient.invalidateQueries({ queryKey: ['procurement-po-template', orgSlug] });
  queryClient.invalidateQueries({ queryKey: ['procurement-po-list', orgSlug] });
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
    previewPurchaseOrder: useMutation({
      mutationFn: (params: { requisitionId: string; data: ProcurementPurchaseOrderInput }) =>
        previewProcurementPurchaseOrderAction({ orgSlug, memberId, ...params }),
    }),
    savePurchaseOrderTemplate: useMutation({
      mutationFn: (template: ProcurementPurchaseOrderTemplateInput) =>
        saveProcurementPurchaseOrderTemplateAction({ orgSlug, memberId, template }),
      onSuccess: () => invalidateProcurement(queryClient, orgSlug),
    }),
    downloadPurchaseOrder: useMutation({
      mutationFn: (purchaseOrderId: string) =>
        fetchProcurementPurchaseOrderDownloadAction({ orgSlug, memberId, purchaseOrderId }),
    }),
    sendPurchaseOrderEmail: useMutation({
      mutationFn: (params: { purchaseOrderId: string; recipientMemberId: string; recipientEmail: string }) =>
        sendProcurementPurchaseOrderEmailAction({ orgSlug, memberId, ...params }),
      onSuccess: () => invalidateProcurement(queryClient, orgSlug),
    }),
  };
}
