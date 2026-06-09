'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createHelpdeskTicketAction } from '@/modules/assets/api/assetServerActions';
import {
  createGeneralHelpTicketAction,
  withdrawHelpdeskTicketAction,
} from '@/modules/helpdesk/api/helpdeskServerActions';
import type { GeneralHelpRequestInput } from '@/modules/helpdesk/types/helpdeskTypes';
import type { HelpdeskTicketCreateInput } from '@/modules/assets/schema/assetSchemas';

export function useHelpdeskMutations(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();

  async function invalidateHelpdesk() {
    await queryClient.invalidateQueries({ queryKey: ['my-tickets', orgSlug] });
    await queryClient.invalidateQueries({ queryKey: ['helpdesk-admin-tickets', orgSlug] });
  }

  return {
    createAssetRequest: useMutation({
      mutationFn: (data: HelpdeskTicketCreateInput) =>
        createHelpdeskTicketAction({ orgSlug, memberId, data }),
      onSuccess: async () => invalidateHelpdesk(),
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
