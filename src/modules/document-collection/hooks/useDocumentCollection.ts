'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  copyDocumentCollectionTemplateAction,
  createDocumentCollectionTemplateAction,
  deleteDocumentCollectionTemplateAction,
  fetchDocumentCollectionPublicAction,
  fetchDocumentCollectionRequestDetailAction,
  fetchDocumentCollectionTemplateAction,
  fetchDocumentCollectionTemplatesAction,
  sendDocumentCollectionRequestsAction,
  submitDocumentCollectionPublicAction,
  updateDocumentCollectionTemplateAction,
} from '@/modules/document-collection/api/documentCollectionServerActions';
import type {
  DocumentCollectionSendPayload,
  DocumentCollectionSubmitPayload,
  DocumentCollectionTemplateCopyPayload,
  DocumentCollectionTemplateCreatePayload,
  DocumentCollectionTemplateUpdatePayload,
} from '@/modules/document-collection/schema/documentCollectionSchemas';
import type {
  DocumentCollectionPublic,
  DocumentCollectionRequestDetail,
  DocumentCollectionTemplate,
  DocumentCollectionTemplateListItem,
} from '@/modules/document-collection/types/documentCollectionTypes';
import { acceptedOnboardingWorkspaceKey } from '@/modules/onboarding/hooks/useOnboarding';

export function documentCollectionTemplatesKey(orgSlug: string, search = '', status = '') {
  return ['document-collection-templates', orgSlug, search, status] as const;
}

export function documentCollectionTemplateKey(orgSlug: string, templateId: string | null) {
  return ['document-collection-template', orgSlug, templateId ?? 'none'] as const;
}

export function useDocumentCollectionTemplates(
  orgSlug: string,
  memberId: string,
  search = '',
  status = '',
) {
  return useQuery<DocumentCollectionTemplateListItem[], Error>({
    queryKey: documentCollectionTemplatesKey(orgSlug, search, status),
    queryFn: () => fetchDocumentCollectionTemplatesAction({ orgSlug, memberId, search, status }),
    enabled: !!orgSlug && !!memberId,
    retry: false,
  });
}

export function useDocumentCollectionTemplate(
  orgSlug: string,
  memberId: string,
  templateId: string | null,
) {
  return useQuery<DocumentCollectionTemplate, Error>({
    queryKey: documentCollectionTemplateKey(orgSlug, templateId),
    queryFn: () => fetchDocumentCollectionTemplateAction({ orgSlug, memberId, templateId: templateId ?? '' }),
    enabled: !!orgSlug && !!memberId && !!templateId,
    retry: false,
  });
}

export function useCreateDocumentCollectionTemplate(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation<DocumentCollectionTemplate, Error, DocumentCollectionTemplateCreatePayload>({
    mutationFn: (data) => createDocumentCollectionTemplateAction({ orgSlug, memberId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-collection-templates', orgSlug] });
    },
  });
}

export function useUpdateDocumentCollectionTemplate(
  orgSlug: string,
  memberId: string,
  templateId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation<DocumentCollectionTemplate, Error, DocumentCollectionTemplateUpdatePayload>({
    mutationFn: (data) =>
      updateDocumentCollectionTemplateAction({ orgSlug, memberId, templateId: templateId ?? '', data }),
    onSuccess: (template) => {
      queryClient.setQueryData(documentCollectionTemplateKey(orgSlug, template.id), template);
      queryClient.invalidateQueries({ queryKey: ['document-collection-templates', orgSlug] });
    },
  });
}

export function useDeleteDocumentCollectionTemplate(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { templateId: string }>({
    mutationFn: ({ templateId }) => deleteDocumentCollectionTemplateAction({ orgSlug, memberId, templateId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['document-collection-templates', orgSlug] });
      queryClient.removeQueries({ queryKey: documentCollectionTemplateKey(orgSlug, variables.templateId) });
    },
  });
}

export function useCopyDocumentCollectionTemplate(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation<DocumentCollectionTemplate, Error, { templateId: string; data: DocumentCollectionTemplateCopyPayload }>({
    mutationFn: ({ templateId, data }) => copyDocumentCollectionTemplateAction({ orgSlug, memberId, templateId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-collection-templates', orgSlug] });
    },
  });
}

export function useSendDocumentCollectionRequests(
  orgSlug: string,
  memberId: string,
  jobSlug: string,
  stageSlug: string,
) {
  const queryClient = useQueryClient();
  return useMutation<{ requestedCount: number }, Error, DocumentCollectionSendPayload>({
    mutationFn: (data) => sendDocumentCollectionRequestsAction({ orgSlug, memberId, jobSlug, stageSlug, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: acceptedOnboardingWorkspaceKey(orgSlug, jobSlug, stageSlug),
      });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['ats-pipeline-job-slug'] });
    },
  });
}

export function useDocumentCollectionRequestDetail(
  orgSlug: string,
  memberId: string,
  requestId: string | null,
) {
  return useQuery<DocumentCollectionRequestDetail, Error>({
    queryKey: ['document-collection-request', orgSlug, requestId ?? 'none'],
    queryFn: () => fetchDocumentCollectionRequestDetailAction({ orgSlug, memberId, requestId: requestId ?? '' }),
    enabled: !!orgSlug && !!memberId && !!requestId,
    retry: false,
  });
}

export function useDocumentCollectionPublic(token: string) {
  return useQuery<DocumentCollectionPublic, Error>({
    queryKey: ['document-collection-public', token],
    queryFn: () => fetchDocumentCollectionPublicAction(token),
    enabled: !!token,
    retry: false,
  });
}

export function useSubmitDocumentCollectionPublic(token: string) {
  return useMutation<{ status: string; message: string }, Error, DocumentCollectionSubmitPayload>({
    mutationFn: (data) => submitDocumentCollectionPublicAction({ token, data }),
  });
}
