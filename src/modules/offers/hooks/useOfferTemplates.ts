'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  copyOfferTemplateAction,
  createOfferTemplateAction,
  createOfferTemplateCategoryAction,
  deleteOfferTemplateAction,
  fetchOfferTemplateAction,
  fetchOfferTemplatesAction,
  updateOfferTemplateAction,
  upsertOfferTemplateSectionAction,
} from '@/modules/offers/api/offerServerActions';
import type {
  OfferTemplateCategoryInput,
  OfferTemplateCopyPayload,
  OfferTemplateCreatePayload,
  OfferTemplateSectionUpsertPayload,
  OfferTemplateUpdatePayload,
} from '@/modules/offers/schema/offerSchemas';
import type {
  OfferTemplate,
  OfferTemplateCategory,
  OfferTemplateListItem,
  OfferTemplateSection,
} from '@/modules/offers/types/offerTypes';

export function useOfferTemplates(
  orgSlug: string,
  memberId: string,
  search = '',
  status?: string,
) {
  return useQuery<OfferTemplateListItem[], Error>({
    queryKey: ['offer-templates', orgSlug, search, status ?? 'active'],
    queryFn: () => fetchOfferTemplatesAction({ orgSlug, memberId, search, status }),
    enabled: !!orgSlug && !!memberId,
    staleTime: 30_000,
  });
}

export function useOfferTemplate(
  orgSlug: string,
  memberId: string,
  templateId: string | null,
) {
  return useQuery<OfferTemplate, Error>({
    queryKey: ['offer-template', orgSlug, templateId ?? 'none'],
    queryFn: () => fetchOfferTemplateAction({ orgSlug, memberId, templateId: templateId ?? '' }),
    enabled: !!orgSlug && !!memberId && !!templateId,
  });
}

export function useCreateOfferTemplate(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation<OfferTemplate, Error, OfferTemplateCreatePayload>({
    mutationFn: (data) => createOfferTemplateAction({ orgSlug, memberId, data }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ['offer-templates', orgSlug] });
      queryClient.setQueryData(['offer-template', orgSlug, template.id], template);
    },
  });
}

export function useUpdateOfferTemplate(orgSlug: string, memberId: string, templateId: string | null) {
  const queryClient = useQueryClient();
  return useMutation<OfferTemplate, Error, OfferTemplateUpdatePayload>({
    mutationFn: (data) =>
      updateOfferTemplateAction({
        orgSlug,
        memberId,
        templateId: templateId ?? '',
        data,
      }),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ['offer-templates', orgSlug] });
      queryClient.setQueryData(['offer-template', orgSlug, template.id], template);
    },
  });
}

export function useDeleteOfferTemplate(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { templateId: string }>({
    mutationFn: ({ templateId }) => deleteOfferTemplateAction({ orgSlug, memberId, templateId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offer-templates', orgSlug] });
      queryClient.removeQueries({ queryKey: ['offer-template', orgSlug, variables.templateId] });
    },
  });
}

export function useCopyOfferTemplate(orgSlug: string, memberId: string) {
  const queryClient = useQueryClient();
  return useMutation<OfferTemplate, Error, { templateId: string; data: OfferTemplateCopyPayload }>({
    mutationFn: ({ templateId, data }) => copyOfferTemplateAction({ orgSlug, memberId, templateId, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-templates', orgSlug] });
    },
  });
}

export function useCreateOfferTemplateCategory(orgSlug: string, memberId: string, templateId: string | null) {
  const queryClient = useQueryClient();
  return useMutation<OfferTemplateCategory, Error, OfferTemplateCategoryInput>({
    mutationFn: (data) =>
      createOfferTemplateCategoryAction({
        orgSlug,
        memberId,
        templateId: templateId ?? '',
        data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-template', orgSlug, templateId ?? 'none'] });
      queryClient.invalidateQueries({ queryKey: ['offer-templates', orgSlug] });
    },
  });
}

export function useUpsertOfferTemplateSection(
  orgSlug: string,
  memberId: string,
  templateId: string | null,
  categoryId: string | null,
) {
  const queryClient = useQueryClient();
  return useMutation<OfferTemplateSection, Error, { sectionKey: string; data: OfferTemplateSectionUpsertPayload }>({
    mutationFn: ({ sectionKey, data }) =>
      upsertOfferTemplateSectionAction({
        orgSlug,
        memberId,
        templateId: templateId ?? '',
        categoryId: categoryId ?? '',
        sectionKey,
        data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer-template', orgSlug, templateId ?? 'none'] });
      queryClient.invalidateQueries({ queryKey: ['offer-templates', orgSlug] });
    },
  });
}
