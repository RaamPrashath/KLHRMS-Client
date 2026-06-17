'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  archiveTicketAction,
  bulkCreateAssetsAction,
  createAssetAction,
  createAssetCategoryAction,
  createAssetCategoryFieldAction,
  createHelpdeskTicketAction,
  createAssetMaintenanceAction,
  deleteAssetAction,
  deleteAssetCategoryAction,
  deleteAssetCategoryFieldAction,
  issueAssetsAction,
  requestAssetReturnAction,
  returnAssetAction,
  unarchiveTicketAction,
  updateAssetAction,
  updateAssetCategoryAction,
  updateAssetCategoryFieldAction,
  updateAssetMaintenanceAction,
  withdrawMyTicketAction,
  provideReplacementAction,
  raiseReplacementAppraisalAction,
  updateReplacementReturnDateAction,
} from '@/modules/assets/api/assetServerActions';
import type { ReplacementProvideInput, ReplacementRaiseAppraisalInput } from '@/modules/assets/types/assetTypes';

export function useAssetMutations(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  const invalidateAll = async (assetId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['assets', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['assets-meta', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['asset-categories', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['asset-available-groups', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['asset-employee-view', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['my-tickets', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['helpdesk-admin-tickets', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['maintenance-tickets', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['archived-tickets', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['assets-dashboard', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['assets-brand-model-analytics', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['assets-os-distribution', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['assets-warranty-feed', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['replacements', orgSlug] });
    if (assetId) {
      await queryClient.invalidateQueries({ queryKey: ['asset', orgSlug, assetId] });
    }
  };

  return {
    bulkCreateAssets: useMutation({
      mutationFn: (data: Parameters<typeof bulkCreateAssetsAction>[0]['data']) =>
        bulkCreateAssetsAction({ orgSlug, memberId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    issueAssets: useMutation({
      mutationFn: (data: Parameters<typeof issueAssetsAction>[0]['data']) =>
        issueAssetsAction({ orgSlug, memberId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    createAsset: useMutation({
      mutationFn: (data: Parameters<typeof createAssetAction>[0]['data']) =>
        createAssetAction({ orgSlug, memberId, data }),
      onSuccess: async (asset) => invalidateAll(asset.id),
    }),
    updateAsset: useMutation({
      mutationFn: ({ assetId, data }: { assetId: string; data: Parameters<typeof updateAssetAction>[0]['data'] }) =>
        updateAssetAction({ orgSlug, memberId, assetId, data }),
      onSuccess: async (asset) => invalidateAll(asset.id),
    }),
    archiveAsset: useMutation({
      mutationFn: (assetId: string) => deleteAssetAction({ orgSlug, memberId, assetId }),
      onSuccess: async () => invalidateAll(),
    }),
    returnAsset: useMutation({
      mutationFn: (data: Parameters<typeof returnAssetAction>[0]['data']) =>
        returnAssetAction({ orgSlug, memberId, data }),
      onSuccess: async (asset) => invalidateAll(asset.id),
    }),
    requestReturn: useMutation({
      mutationFn: (assetId: string) =>
        requestAssetReturnAction({ orgSlug, memberId, assetId }),
      onSuccess: async () => invalidateAll(),
    }),
    createMaintenance: useMutation({
      mutationFn: (data: Parameters<typeof createAssetMaintenanceAction>[0]['data']) =>
        createAssetMaintenanceAction({ orgSlug, memberId, data }),
      onSuccess: async (asset) => invalidateAll(asset.id),
    }),
    createHelpdeskTicket: useMutation({
      mutationFn: (data: Parameters<typeof createHelpdeskTicketAction>[0]['data']) =>
        createHelpdeskTicketAction({ orgSlug, memberId, data }),
      onSuccess: async (ticket) => invalidateAll(ticket.assetId ?? undefined),
    }),
    withdrawMyTicket: useMutation({
      mutationFn: (ticketId: string) => withdrawMyTicketAction({ orgSlug, memberId, ticketId }),
      onSuccess: async (ticket) => invalidateAll(ticket.assetId ?? undefined),
    }),
    updateMaintenance: useMutation({
      mutationFn: ({
        assetId,
        data,
      }: {
        assetId?: string | null;
        data: Parameters<typeof updateAssetMaintenanceAction>[0]['data'];
      }) => updateAssetMaintenanceAction({ orgSlug, memberId, assetId, data }),
      onSuccess: async (_asset, variables) => invalidateAll(variables.assetId ?? undefined),
    }),
    provideReplacement: useMutation({
      mutationFn: (data: ReplacementProvideInput) =>
        provideReplacementAction({ orgSlug, memberId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    raiseReplacementAppraisal: useMutation({
      mutationFn: (data: ReplacementRaiseAppraisalInput) =>
        raiseReplacementAppraisalAction({ orgSlug, memberId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    updateReplacementReturnDate: useMutation({
      mutationFn: ({
        assignmentId,
        expectedReturnDate,
      }: {
        assignmentId: string;
        expectedReturnDate: string;
      }) => updateReplacementReturnDateAction({ orgSlug, memberId, assignmentId, expectedReturnDate }),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['replacements', orgSlug] });
      },
    }),
    createCategory: useMutation({
      mutationFn: (data: { name: string; description?: string; assetCode?: string | null }) =>
        createAssetCategoryAction({ orgSlug, memberId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    updateCategory: useMutation({
      mutationFn: ({
        categoryId,
        data,
      }: {
        categoryId: string;
        data: { name?: string; description?: string; assetCode?: string | null };
      }) => updateAssetCategoryAction({ orgSlug, memberId, categoryId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    deleteCategory: useMutation({
      mutationFn: (categoryId: string) => deleteAssetCategoryAction({ orgSlug, memberId, categoryId }),
      onSuccess: async () => invalidateAll(),
    }),
    createCategoryField: useMutation({
      mutationFn: ({
        categoryId,
        data,
      }: {
        categoryId: string;
        data: {
          fieldName: string;
          fieldType: string;
          fieldOptions?: string[];
          isRequired?: boolean;
          displayOrder?: number;
        };
      }) => createAssetCategoryFieldAction({ orgSlug, memberId, categoryId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    updateCategoryField: useMutation({
      mutationFn: ({
        fieldId,
        data,
      }: {
        fieldId: string;
        data: {
          fieldName?: string;
          fieldType?: string;
          fieldOptions?: string[] | null;
          isRequired?: boolean;
          displayOrder?: number;
        };
      }) => updateAssetCategoryFieldAction({ orgSlug, memberId, fieldId, data }),
      onSuccess: async () => invalidateAll(),
    }),
    deleteCategoryField: useMutation({
      mutationFn: (fieldId: string) => deleteAssetCategoryFieldAction({ orgSlug, memberId, fieldId }),
      onSuccess: async () => invalidateAll(),
    }),
    archiveTicket: useMutation({
      mutationFn: (ticketId: string) => archiveTicketAction({ orgSlug, memberId, ticketId }),
      onSuccess: async () => invalidateAll(),
    }),
    unarchiveTicket: useMutation({
      mutationFn: (ticketId: string) => unarchiveTicketAction({ orgSlug, memberId, ticketId }),
      onSuccess: async () => invalidateAll(),
    }),
  };
}
