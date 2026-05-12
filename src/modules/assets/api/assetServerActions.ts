'use server';

import {
  assetMaintenanceCreateSchema,
  assetMaintenanceUpdateSchema,
  assetProvideSchema,
  assetReturnSchema,
  assetSchema,
  type AssetInput,
  type AssetMaintenanceCreateInput,
  type AssetMaintenanceUpdateInput,
  type AssetProvideInput,
  type AssetReturnInput,
} from '@/modules/assets/schema/assetSchemas';
import type {
  AssetDetail,
  AssetFiltersState,
  AssetListResponse,
  AssetMetaResponse,
  AssetReportType,
} from '@/modules/assets/types/assetTypes';

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

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    if (res.headers.get('content-type')?.includes('text/csv')) {
      return (await res.text()) as T;
    }
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

function buildQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

function normalizeAssetPayload(data: AssetInput) {
  const parsed = assetSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      JSON.stringify({
        status: 400,
        message: parsed.error.issues[0]?.message ?? 'Validation failed',
      }),
    );
  }

  return {
    assetCode: parsed.data.assetCode,
    name: parsed.data.name,
    category: parsed.data.category,
    serialNumber: parsed.data.serialNumber || null,
    model: parsed.data.model || null,
    purchaseDate: parsed.data.purchaseDate || null,
    purchasePrice: parsed.data.purchasePrice ?? null,
    warrantyExpiryDate: parsed.data.warrantyExpiryDate || null,
    condition: parsed.data.condition,
    status: parsed.data.status,
    location: parsed.data.location || null,
    quantity: parsed.data.quantity,
  };
}

export async function fetchAssetsAction(params: {
  orgSlug: string;
  memberId: string;
  filters: AssetFiltersState;
}): Promise<AssetListResponse> {
  const query = buildQuery({
    search: params.filters.search,
    category: params.filters.category,
    status: params.filters.status,
    current_holder_member_id: params.filters.currentHolderMemberId,
    page: params.filters.page,
    page_size: params.filters.pageSize,
  });

  const res = await fetch(`${getApiUrl()}/assets${query}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<AssetListResponse>(res);
}

export async function fetchAssetMetaAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<AssetMetaResponse> {
  const res = await fetch(`${getApiUrl()}/assets/meta`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<AssetMetaResponse>(res);
}

export async function fetchAssetDetailAction(params: {
  orgSlug: string;
  memberId: string;
  assetId: string;
}): Promise<AssetDetail> {
  const res = await fetch(`${getApiUrl()}/assets/${params.assetId}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<AssetDetail>(res);
}

export async function createAssetAction(params: {
  orgSlug: string;
  memberId: string;
  data: AssetInput;
}): Promise<AssetDetail> {
  const res = await fetch(`${getApiUrl()}/assets`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(normalizeAssetPayload(params.data)),
  });
  return handleResponse<AssetDetail>(res);
}

export async function updateAssetAction(params: {
  orgSlug: string;
  memberId: string;
  assetId: string;
  data: AssetInput;
}): Promise<AssetDetail> {
  const res = await fetch(`${getApiUrl()}/assets/${params.assetId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(normalizeAssetPayload(params.data)),
  });
  return handleResponse<AssetDetail>(res);
}

export async function deleteAssetAction(params: {
  orgSlug: string;
  memberId: string;
  assetId: string;
}): Promise<void> {
  const res = await fetch(`${getApiUrl()}/assets/${params.assetId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<void>(res);
}

export async function provideAssetAction(params: {
  orgSlug: string;
  memberId: string;
  data: AssetProvideInput;
}): Promise<AssetDetail> {
  const parsed = assetProvideSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(
      JSON.stringify({
        status: 400,
        message: parsed.error.issues[0]?.message ?? 'Validation failed',
      }),
    );
  }

  const { assetId, ...payload } = parsed.data;
  const res = await fetch(`${getApiUrl()}/assets/${assetId}/provide`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({
      memberId: payload.memberId,
      providedDate: payload.providedDate || null,
      conditionWhileProviding: payload.conditionWhileProviding,
      providedByMemberId: payload.providedByMemberId || null,
      notes: payload.notes || null,
    }),
  });
  return handleResponse<AssetDetail>(res);
}

export async function returnAssetAction(params: {
  orgSlug: string;
  memberId: string;
  data: AssetReturnInput;
}): Promise<AssetDetail> {
  const parsed = assetReturnSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(
      JSON.stringify({
        status: 400,
        message: parsed.error.issues[0]?.message ?? 'Validation failed',
      }),
    );
  }

  const { assetId, ...payload } = parsed.data;
  const res = await fetch(`${getApiUrl()}/assets/${assetId}/return`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({
      memberId: payload.memberId,
      returnDate: payload.returnDate || null,
      returnedCondition: payload.returnedCondition,
      receivedByMemberId: payload.receivedByMemberId || null,
      returnNotes: payload.returnNotes || null,
      nextStatus: payload.nextStatus || null,
    }),
  });
  return handleResponse<AssetDetail>(res);
}

export async function createAssetMaintenanceAction(params: {
  orgSlug: string;
  memberId: string;
  data: AssetMaintenanceCreateInput;
}): Promise<AssetDetail> {
  const parsed = assetMaintenanceCreateSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(
      JSON.stringify({
        status: 400,
        message: parsed.error.issues[0]?.message ?? 'Validation failed',
      }),
    );
  }

  const { assetId, ...payload } = parsed.data;
  const res = await fetch(`${getApiUrl()}/assets/${assetId}/maintenance`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({
      maintenanceType: payload.maintenanceType,
      issueDescription: payload.issueDescription,
      serviceDate: payload.serviceDate,
      expectedCompletionDate: payload.expectedCompletionDate || null,
      cost: payload.cost ?? null,
      status: payload.status,
      conditionBeforeMaintenance: payload.conditionBeforeMaintenance || null,
      notes: payload.notes || null,
    }),
  });
  return handleResponse<AssetDetail>(res);
}

export async function updateAssetMaintenanceAction(params: {
  orgSlug: string;
  memberId: string;
  assetId: string;
  data: AssetMaintenanceUpdateInput;
}): Promise<AssetDetail> {
  const parsed = assetMaintenanceUpdateSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(
      JSON.stringify({
        status: 400,
        message: parsed.error.issues[0]?.message ?? 'Validation failed',
      }),
    );
  }

  const { maintenanceId, ...payload } = parsed.data;
  const res = await fetch(`${getApiUrl()}/assets/${params.assetId}/maintenance/${maintenanceId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({
      status: payload.status,
      expectedCompletionDate: payload.expectedCompletionDate || null,
      completedDate: payload.completedDate || null,
      conditionAfterMaintenance: payload.conditionAfterMaintenance || null,
      nextAssetStatus: payload.nextAssetStatus || null,
      notes: payload.notes || null,
    }),
  });
  return handleResponse<AssetDetail>(res);
}

export async function exportAssetsPdfAction(params: {
  orgSlug: string;
  memberId: string;
  reportType: AssetReportType;
  memberIdFilter?: string;
}): Promise<{ base64: string; fileName: string }> {
  const query = buildQuery({
    report_type: params.reportType,
    member_id: params.memberIdFilter,
  });
  const res = await fetch(`${getApiUrl()}/assets/report.pdf${query}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });

  if (!res.ok) {
    return handleResponse<{ base64: string; fileName: string }>(res);
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  return {
    base64: bytes.toString('base64'),
    fileName: `${params.reportType.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}
