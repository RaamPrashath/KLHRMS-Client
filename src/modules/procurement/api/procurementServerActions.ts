'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import {
  bulkProcurementSchema,
  procurementDecisionSchema,
  procurementPurchaseOrderSchema,
  procurementPurchaseOrderTemplateSchema,
  replacementProcurementSchema,
  type BulkProcurementInput,
  type ProcurementDecisionInput,
  type ProcurementPurchaseOrderInput,
  type ProcurementPurchaseOrderTemplateInput,
  type ReplacementProcurementInput,
} from '@/modules/procurement/schema/procurementSchemas';
import type {
  ProcurementAdminRecipientsResponse,
  ProcurementListResponse,
  ProcurementMetaResponse,
  ProcurementPdfPreviewResponse,
  ProcurementPurchaseOrderDownloadResponse,
  ProcurementPurchaseOrderDraftResponse,
  ProcurementPurchaseOrderIssueResponse,
  ProcurementPurchaseOrderListResponse,
  ProcurementPurchaseOrderTemplateRecord,
  ProcurementRequisitionRecord,
} from '@/modules/procurement/types/procurementTypes';

function getApiUrl(): string {
  const url = process.env.HRMS_API_URL;
  if (!url) throw new Error('HRMS_API_URL environment variable is not set');
  return url;
}

function buildHeaders(orgSlug: string, memberId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-organization-slug': orgSlug,
    'x-membership-id': memberId,
  };
}

async function getCurrentOrgMember(orgSlug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error(JSON.stringify({ status: 401, message: 'Unauthorized' }));
  }
  return requireOrgMembership(session.user.id, orgSlug);
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  let message = `Request failed with status ${res.status}`;
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') message = body.detail;
    else if (typeof body?.message === 'string') message = body.message;
  } catch {
    // ignore
  }

  throw new Error(JSON.stringify({ status: res.status, message }));
}

export async function fetchProcurementMetaAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<ProcurementMetaResponse> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/procurement/meta`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<ProcurementMetaResponse>(res);
}

export async function fetchProcurementListAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<ProcurementListResponse> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/procurement`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<ProcurementListResponse>(res);
}

export async function fetchProcurementPurchaseOrdersAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<ProcurementPurchaseOrderListResponse> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/procurement/purchase-orders`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<ProcurementPurchaseOrderListResponse>(res);
}

export async function fetchProcurementAdminRecipientsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<ProcurementAdminRecipientsResponse> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/procurement/admin-recipients`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<ProcurementAdminRecipientsResponse>(res);
}

export async function createBulkProcurementAction(params: {
  orgSlug: string;
  memberId: string;
  data: BulkProcurementInput;
}): Promise<ProcurementRequisitionRecord> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const parsed = bulkProcurementSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/procurement`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
    body: JSON.stringify({
      ...parsed.data,
      assetCode: parsed.data.assetCode || null,
      categoryDefinitionId: parsed.data.categoryDefinitionId || null,
      requiredByDate: parsed.data.requiredByDate || null,
      costCenterOrDepartmentId: parsed.data.costCenterOrDepartmentId || null,
      vendorPreference: parsed.data.vendorPreference || null,
      specificationNotes: parsed.data.specificationNotes || null,
    }),
  });
  return handleResponse<ProcurementRequisitionRecord>(res);
}

export async function createReplacementProcurementAction(params: {
  orgSlug: string;
  memberId: string;
  data: ReplacementProcurementInput;
}): Promise<ProcurementRequisitionRecord> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const parsed = replacementProcurementSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/procurement`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
    body: JSON.stringify({
      ...parsed.data,
      requiredByDate: parsed.data.requiredByDate || null,
      costCenterOrDepartmentId: parsed.data.costCenterOrDepartmentId || null,
      vendorPreference: parsed.data.vendorPreference || null,
    }),
  });
  return handleResponse<ProcurementRequisitionRecord>(res);
}

export async function submitProcurementAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<ProcurementRequisitionRecord> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/procurement/${params.requisitionId}/submit`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
  });
  return handleResponse<ProcurementRequisitionRecord>(res);
}

async function decideProcurement(
  orgSlug: string,
  requisitionId: string,
  path: 'approve' | 'reject',
  data: ProcurementDecisionInput,
) {
  const { member } = await getCurrentOrgMember(orgSlug);
  const parsed = procurementDecisionSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(`${getApiUrl()}/procurement/${requisitionId}/${path}`, {
    method: 'POST',
    headers: buildHeaders(orgSlug, member.id),
    body: JSON.stringify({
      comment: parsed.data.comment || null,
    }),
  });
  return handleResponse<ProcurementRequisitionRecord>(res);
}

export async function approveProcurementAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  data: ProcurementDecisionInput;
}): Promise<ProcurementRequisitionRecord> {
  return decideProcurement(params.orgSlug, params.requisitionId, 'approve', params.data);
}

export async function rejectProcurementAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  data: ProcurementDecisionInput;
}): Promise<ProcurementRequisitionRecord> {
  return decideProcurement(params.orgSlug, params.requisitionId, 'reject', params.data);
}

export async function cancelProcurementAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<ProcurementRequisitionRecord> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/procurement/${params.requisitionId}/cancel`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
  });
  return handleResponse<ProcurementRequisitionRecord>(res);
}

export async function issueProcurementPurchaseOrderAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  data: ProcurementPurchaseOrderInput;
}): Promise<ProcurementPurchaseOrderIssueResponse> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const parsed = procurementPurchaseOrderSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const res = await fetch(`${getApiUrl()}/procurement/${params.requisitionId}/purchase-orders`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
    body: JSON.stringify({
      formatKey: parsed.data.formatKey,
      template: parsed.data.template,
      document: parsed.data.document,
      recipientMemberId: parsed.data.recipientMemberId || null,
      recipientEmail: parsed.data.recipientEmail || null,
      message: parsed.data.message || null,
      sendToAdmin: parsed.data.sendToAdmin,
    }),
  });
  return handleResponse<ProcurementPurchaseOrderIssueResponse>(res);
}

export async function fetchProcurementPurchaseOrderDraftAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
}): Promise<ProcurementPurchaseOrderDraftResponse> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/procurement/${params.requisitionId}/purchase-order-draft`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<ProcurementPurchaseOrderDraftResponse>(res);
}

export async function previewProcurementPurchaseOrderAction(params: {
  orgSlug: string;
  memberId: string;
  requisitionId: string;
  data: ProcurementPurchaseOrderInput;
}): Promise<ProcurementPdfPreviewResponse> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const parsed = procurementPurchaseOrderSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const res = await fetch(`${getApiUrl()}/procurement/${params.requisitionId}/purchase-order-preview`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, member.id),
    body: JSON.stringify({
      formatKey: parsed.data.formatKey,
      template: parsed.data.template,
      document: parsed.data.document,
    }),
  });
  return handleResponse<ProcurementPdfPreviewResponse>(res);
}

export async function fetchProcurementPurchaseOrderTemplateAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<ProcurementPurchaseOrderTemplateRecord> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/procurement/purchase-order-template`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<ProcurementPurchaseOrderTemplateRecord>(res);
}

export async function saveProcurementPurchaseOrderTemplateAction(params: {
  orgSlug: string;
  memberId: string;
  template: ProcurementPurchaseOrderTemplateInput;
}): Promise<ProcurementPurchaseOrderTemplateRecord> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const parsed = procurementPurchaseOrderTemplateSchema.safeParse(params.template);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  const res = await fetch(`${getApiUrl()}/procurement/purchase-order-template`, {
    method: 'PUT',
    headers: buildHeaders(params.orgSlug, member.id),
    body: JSON.stringify({ template: parsed.data }),
  });
  return handleResponse<ProcurementPurchaseOrderTemplateRecord>(res);
}

export async function fetchProcurementPurchaseOrderDownloadAction(params: {
  orgSlug: string;
  memberId: string;
  purchaseOrderId: string;
}): Promise<ProcurementPurchaseOrderDownloadResponse> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/procurement/purchase-orders/${params.purchaseOrderId}/download`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, member.id),
    cache: 'no-store',
  });
  return handleResponse<ProcurementPurchaseOrderDownloadResponse>(res);
}
