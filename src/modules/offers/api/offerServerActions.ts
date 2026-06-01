'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import {
  offerDispatchPayloadSchema,
  offerTemplateCategoryCreatePayloadSchema,
  offerTemplateCopyPayloadSchema,
  offerTemplateCreatePayloadSchema,
  offerTemplateSectionUpsertPayloadSchema,
  offerTemplateUpdatePayloadSchema,
  type OfferDispatchPayload,
  type OfferTemplateCategoryInput,
  type OfferTemplateCopyPayload,
  type OfferTemplateCreatePayload,
  type OfferTemplateSectionUpsertPayload,
  type OfferTemplateUpdatePayload,
} from '@/modules/offers/schema/offerSchemas';
import type {
  OfferCandidateValidationResponse,
  OfferApplicationLetters,
  OfferDispatchBatchDetail,
  OfferDispatchCreateResponse,
  OfferStageWorkspace,
  OfferTemplate,
  OfferTemplateCategory,
  OfferTemplateSection,
  OfferTemplateListItem,
} from '@/modules/offers/types/offerTypes';

function getApiUrl(): string {
  return getHrmsApiUrl();
}

function buildHeaders(orgSlug: string, memberId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-organization-slug': orgSlug,
    'x-membership-id': memberId,
  };
}

function buildAuthHeaders(orgSlug: string, memberId: string): HeadersInit {
  return {
    'x-organization-slug': orgSlug,
    'x-membership-id': memberId,
  };
}

function errorMessageFromBody(status: number, body: unknown): string {
  if (typeof body === 'object' && body !== null) {
    const detail = 'detail' in body ? (body as { detail?: unknown }).detail : undefined;
    if (typeof detail === 'string') return detail;
    if (typeof detail === 'object' && detail !== null && 'message' in detail) {
      const message = (detail as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
    const message = 'message' in body ? (body as { message?: unknown }).message : undefined;
    if (typeof message === 'string') return message;
  }
  return `Request failed with status ${status}`;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  throw new Error(JSON.stringify({ status: res.status, message: errorMessageFromBody(res.status, body), body }));
}

export async function fetchOfferWorkspaceAction(params: {
  orgSlug: string;
  memberId: string;
  jobSlug: string;
  stageSlug: string;
}): Promise<OfferStageWorkspace> {
  const res = await fetch(
    `${getApiUrl()}/offers/pipeline/jobs/${encodeURIComponent(params.jobSlug)}/stages/${encodeURIComponent(params.stageSlug)}/workspace`,
    {
      method: 'GET',
      headers: buildHeaders(params.orgSlug, params.memberId),
      cache: 'no-store',
    },
  );
  return handleResponse<OfferStageWorkspace>(res);
}

export async function fetchOfferTemplatesAction(params: {
  orgSlug: string;
  memberId: string;
  search?: string;
  status?: string;
}): Promise<OfferTemplateListItem[]> {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.status?.trim()) query.set('status', params.status.trim());
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`${getApiUrl()}/offers/templates${suffix}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<OfferTemplateListItem[]>(res);
}

export async function fetchOfferTemplateAction(params: {
  orgSlug: string;
  memberId: string;
  templateId: string;
}): Promise<OfferTemplate> {
  const res = await fetch(`${getApiUrl()}/offers/templates/${encodeURIComponent(params.templateId)}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<OfferTemplate>(res);
}

export async function createOfferTemplateAction(params: {
  orgSlug: string;
  memberId: string;
  data: OfferTemplateCreatePayload;
}): Promise<OfferTemplate> {
  const parsed = offerTemplateCreatePayloadSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/offers/templates`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<OfferTemplate>(res);
}

export async function updateOfferTemplateAction(params: {
  orgSlug: string;
  memberId: string;
  templateId: string;
  data: OfferTemplateUpdatePayload;
}): Promise<OfferTemplate> {
  const parsed = offerTemplateUpdatePayloadSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/offers/templates/${encodeURIComponent(params.templateId)}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<OfferTemplate>(res);
}

export async function uploadOfferTemplateAssetAction(params: {
  orgSlug: string;
  memberId: string;
  templateId: string;
  file: File;
}): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', params.file);
  const res = await fetch(`${getApiUrl()}/offers/templates/${encodeURIComponent(params.templateId)}/assets`, {
    method: 'POST',
    headers: buildAuthHeaders(params.orgSlug, params.memberId),
    body: formData,
  });
  return handleResponse<{ url: string }>(res);
}

export async function deleteOfferTemplateAction(params: {
  orgSlug: string;
  memberId: string;
  templateId: string;
}): Promise<void> {
  const res = await fetch(`${getApiUrl()}/offers/templates/${encodeURIComponent(params.templateId)}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<void>(res);
}

export async function copyOfferTemplateAction(params: {
  orgSlug: string;
  memberId: string;
  templateId: string;
  data: OfferTemplateCopyPayload;
}): Promise<OfferTemplate> {
  const parsed = offerTemplateCopyPayloadSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/offers/templates/${encodeURIComponent(params.templateId)}/copy`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<OfferTemplate>(res);
}

export async function createOfferTemplateCategoryAction(params: {
  orgSlug: string;
  memberId: string;
  templateId: string;
  data: OfferTemplateCategoryInput;
}): Promise<OfferTemplateCategory> {
  const parsed = offerTemplateCategoryCreatePayloadSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/offers/templates/${encodeURIComponent(params.templateId)}/categories`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<OfferTemplateCategory>(res);
}

export async function upsertOfferTemplateSectionAction(params: {
  orgSlug: string;
  memberId: string;
  templateId: string;
  categoryId: string;
  sectionKey: string;
  data: OfferTemplateSectionUpsertPayload;
}): Promise<OfferTemplateSection> {
  const parsed = offerTemplateSectionUpsertPayloadSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(
    `${getApiUrl()}/offers/templates/${encodeURIComponent(params.templateId)}/categories/${encodeURIComponent(params.categoryId)}/sections/${encodeURIComponent(params.sectionKey)}`,
    {
      method: 'PUT',
      headers: buildHeaders(params.orgSlug, params.memberId),
      body: JSON.stringify(parsed.data),
    },
  );
  return handleResponse<OfferTemplateSection>(res);
}

export async function validateOfferDispatchAction(params: {
  orgSlug: string;
  memberId: string;
  jobSlug: string;
  stageSlug: string;
  data: OfferDispatchPayload;
}): Promise<OfferCandidateValidationResponse> {
  const parsed = offerDispatchPayloadSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(
    `${getApiUrl()}/offers/pipeline/jobs/${encodeURIComponent(params.jobSlug)}/stages/${encodeURIComponent(params.stageSlug)}/validate`,
    {
      method: 'POST',
      headers: buildHeaders(params.orgSlug, params.memberId),
      body: JSON.stringify(parsed.data),
    },
  );
  return handleResponse<OfferCandidateValidationResponse>(res);
}

export async function createOfferDispatchAction(params: {
  orgSlug: string;
  memberId: string;
  jobSlug: string;
  stageSlug: string;
  data: OfferDispatchPayload;
}): Promise<OfferDispatchCreateResponse> {
  const parsed = offerDispatchPayloadSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(
    `${getApiUrl()}/offers/pipeline/jobs/${encodeURIComponent(params.jobSlug)}/stages/${encodeURIComponent(params.stageSlug)}/dispatch`,
    {
      method: 'POST',
      headers: buildHeaders(params.orgSlug, params.memberId),
      body: JSON.stringify(parsed.data),
    },
  );
  return handleResponse<OfferDispatchCreateResponse>(res);
}

export async function fetchOfferDispatchBatchAction(params: {
  orgSlug: string;
  memberId: string;
  batchId: string;
}): Promise<OfferDispatchBatchDetail> {
  const res = await fetch(`${getApiUrl()}/offers/batches/${encodeURIComponent(params.batchId)}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<OfferDispatchBatchDetail>(res);
}

export async function retryFailedOfferDispatchBatchAction(params: {
  orgSlug: string;
  memberId: string;
  batchId: string;
}): Promise<OfferDispatchBatchDetail> {
  const res = await fetch(`${getApiUrl()}/offers/batches/${encodeURIComponent(params.batchId)}/retry-failed`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<OfferDispatchBatchDetail>(res);
}

export async function fetchApplicationOfferLettersAction(params: {
  orgSlug: string;
  memberId: string;
  applicationId: string;
}): Promise<OfferApplicationLetters> {
  const res = await fetch(`${getApiUrl()}/offers/applications/${encodeURIComponent(params.applicationId)}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<OfferApplicationLetters>(res);
}
