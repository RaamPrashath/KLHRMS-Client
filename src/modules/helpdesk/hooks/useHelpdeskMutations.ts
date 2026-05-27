'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAssetMaintenanceAction } from '@/modules/assets/api/assetServerActions';
import {
  createGeneralHelpTicketAction,
  withdrawHelpdeskTicketAction,
} from '@/modules/helpdesk/api/helpdeskServerActions';
import type { AssetMaintenanceCreateInput } from '@/modules/assets/schema/assetSchemas';
import type { GeneralHelpRequestInput } from '@/modules/helpdesk/types/helpdeskTypes';

export function useHelpdeskMutations(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  async function invalidateHelpdesk(assetId?: string) {
    await queryClient.invalidateQueries({ queryKey: ['helpdesk-tickets', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['my-tickets', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['assets', orgSlug] });
    if (assetId) await queryClient.invalidateQueries({ queryKey: ['asset', orgSlug, assetId] });
  }

  return {
    createAssetIssue: useMutation({
      mutationFn: (data: AssetMaintenanceCreateInput) =>
        createAssetMaintenanceAction({ orgSlug, memberId, data }),
      onSuccess: async (asset) => invalidateHelpdesk(asset.id),
    }),
    createGeneralHelp: useMutation({
      mutationFn: (data: GeneralHelpRequestInput) =>
        createGeneralHelpTicketAction({ orgSlug, memberId, data }),
      onSuccess: async () => invalidateHelpdesk(),
    }),
    withdrawTicket: useMutation({
      mutationFn: (ticketId: string) =>
        withdrawHelpdeskTicketAction({ orgSlug, memberId, ticketId }),
      onSuccess: async () => invalidateHelpdesk(),
    }),
  };
}
