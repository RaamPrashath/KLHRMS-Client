'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import {
  documentCollectionSendPayloadSchema,
  documentCollectionSubmitPayloadSchema,
  documentCollectionTemplateCopyPayloadSchema,
  documentCollectionTemplateCreatePayloadSchema,
  documentCollectionTemplateUpdatePayloadSchema,
  type DocumentCollectionSendPayload,
  type DocumentCollectionSubmitPayload,
  type DocumentCollectionTemplateCopyPayload,
  type DocumentCollectionTemplateCreatePayload,
  type DocumentCollectionTemplateUpdatePayload,
} from '@/modules/document-collection/schema/documentCollectionSchemas';
import type {
  DocumentCollectionPublic,
  DocumentCollectionRequestDetail,
  DocumentCollectionTemplate,
  DocumentCollectionTemplateListItem,
} from '@/modules/document-collection/types/documentCollectionTypes';

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

function errorMessageFromBody(status: number, body: unknown): string {
  if (typeof body === 'object' && body !== null) {
    const detail = 'detail' in body ? (body as { detail?: unknown }).detail : undefined;
    if (typeof detail === 'string') return detail;
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

export async function fetchDocumentCollectionTemplatesAction(params: {
  orgSlug: string;
  memberId: string;
  search?: string;
  status?: string;
}): Promise<DocumentCollectionTemplateListItem[]> {
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.status?.trim()) query.set('status', params.status.trim());
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const res = await fetch(`${getApiUrl()}/document-collection/templates${suffix}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<DocumentCollectionTemplateListItem[]>(res);
}

export async function fetchDocumentCollectionTemplateAction(params: {
  orgSlug: string;
  memberId: string;
  templateId: string;
}): Promise<DocumentCollectionTemplate> {
  const res = await fetch(`${getApiUrl()}/document-collection/templates/${encodeURIComponent(params.templateId)}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<DocumentCollectionTemplate>(res);
}

export async function createDocumentCollectionTemplateAction(params: {
  orgSlug: string;
  memberId: string;
  data: DocumentCollectionTemplateCreatePayload;
}): Promise<DocumentCollectionTemplate> {
  const parsed = documentCollectionTemplateCreatePayloadSchema.safeParse(params.data);
  if (!parsed.success) throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  const res = await fetch(`${getApiUrl()}/document-collection/templates`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<DocumentCollectionTemplate>(res);
}

export async function updateDocumentCollectionTemplateAction(params: {
  orgSlug: string;
  memberId: string;
  templateId: string;
  data: DocumentCollectionTemplateUpdatePayload;
}): Promise<DocumentCollectionTemplate> {
  const parsed = documentCollectionTemplateUpdatePayloadSchema.safeParse(params.data);
  if (!parsed.success) throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  const res = await fetch(`${getApiUrl()}/document-collection/templates/${encodeURIComponent(params.templateId)}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<DocumentCollectionTemplate>(res);
}

export async function deleteDocumentCollectionTemplateAction(params: {
  orgSlug: string;
  memberId: string;
  templateId: string;
}): Promise<void> {
  const res = await fetch(`${getApiUrl()}/document-collection/templates/${encodeURIComponent(params.templateId)}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<void>(res);
}

export async function copyDocumentCollectionTemplateAction(params: {
  orgSlug: string;
  memberId: string;
  templateId: string;
  data: DocumentCollectionTemplateCopyPayload;
}): Promise<DocumentCollectionTemplate> {
  const parsed = documentCollectionTemplateCopyPayloadSchema.safeParse(params.data);
  if (!parsed.success) throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  const res = await fetch(`${getApiUrl()}/document-collection/templates/${encodeURIComponent(params.templateId)}/copy`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<DocumentCollectionTemplate>(res);
}

export async function sendDocumentCollectionRequestsAction(params: {
  orgSlug: string;
  memberId: string;
  jobSlug: string;
  stageSlug: string;
  data: DocumentCollectionSendPayload;
}): Promise<{ requestedCount: number }> {
  const parsed = documentCollectionSendPayloadSchema.safeParse(params.data);
  if (!parsed.success) throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  const res = await fetch(
    `${getApiUrl()}/document-collection/pipeline/jobs/${encodeURIComponent(params.jobSlug)}/stages/${encodeURIComponent(params.stageSlug)}/send-requests`,
    {
      method: 'POST',
      headers: buildHeaders(params.orgSlug, params.memberId),
      body: JSON.stringify(parsed.data),
    },
  );
  return handleResponse<{ requestedCount: number }>(res);
}

export async function fetchDocumentCollectionRequestDetailAction(params: {
  orgSlug: string;
  memberId: string;
  requestId: string;
}): Promise<DocumentCollectionRequestDetail> {
  const res = await fetch(`${getApiUrl()}/document-collection/requests/${encodeURIComponent(params.requestId)}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<DocumentCollectionRequestDetail>(res);
}

export async function fetchDocumentCollectionPublicAction(token: string): Promise<DocumentCollectionPublic> {
  const res = await fetch(`${getApiUrl()}/public/document-collection/${encodeURIComponent(token)}`, {
    method: 'GET',
    cache: 'no-store',
  });
  return handleResponse<DocumentCollectionPublic>(res);
}

export async function submitDocumentCollectionPublicAction(params: {
  token: string;
  data: DocumentCollectionSubmitPayload;
}): Promise<{ status: string; message: string }> {
  const parsed = documentCollectionSubmitPayloadSchema.safeParse(params.data);
  if (!parsed.success) throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  const res = await fetch(`${getApiUrl()}/public/document-collection/${encodeURIComponent(params.token)}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<{ status: string; message: string }>(res);
}
