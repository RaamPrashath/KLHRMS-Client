'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import {
  assetIssueSchema,
  assetMaintenanceCreateSchema,
  assetMaintenanceUpdateSchema,
  assetRevokeSwapSchema,
  helpdeskTicketCreateSchema,
  assetReturnSchema,
  assetSchema,
  type AssetInput,
  type AssetIssueInput,
  type AssetMaintenanceCreateInput,
  type AssetMaintenanceUpdateInput,
  type AssetRevokeSwapInput,
  type HelpdeskTicketCreateInput,
  type AssetReturnInput,
} from '@/modules/assets/schema/assetSchemas';
import type {
  AssetCategoryDefinition,
  AssetCategoryFieldDefinition,
  AssetDetail,
  EmployeeAssetViewResponse,
  AssetRevokeSwapInput as AssetRevokeSwapPayload,
  AssetSwapExecutionResult,
  AssetSwapPreview,
  AssetFiltersState,
  AssetIdDefinition,
  AssetIssueResponse,
  AssetListResponse,
  AssetMetaResponse,
  AssetReportType,
  AvailableAssetGroup,
  BulkAssetCreateInput,
  TicketAttachmentMetadata,
  TicketMode,
} from '@/modules/assets/types/assetTypes';

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
    categoryDefinitionId: parsed.data.categoryDefinitionId || null,
    serialNumber: parsed.data.serialNumber || null,
    model: parsed.data.model || null,
    purchaseDate: parsed.data.purchaseDate || null,
    purchasePrice: parsed.data.purchasePrice ?? null,
    warrantyExpiryDate: parsed.data.warrantyExpiryDate || null,
    condition: parsed.data.condition,
    status: parsed.data.status,
    location: parsed.data.location || null,
    quantity: parsed.data.quantity,
    customFields: (parsed.data.customFields || []).map((cf) => ({
      fieldDefinitionId: cf.fieldDefinitionId,
      value: cf.value ?? null,
    })),
    units: (parsed.data.units || []).map((u) => ({
      serialNumber: u.serialNumber ?? null,
    })),
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
    category_definition_id: params.filters.categoryDefinitionId,
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

export async function fetchEmployeeAssetViewAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<EmployeeAssetViewResponse> {
  const res = await fetch(`${getApiUrl()}/assets/employee-view`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<EmployeeAssetViewResponse>(res);
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
  const payload = normalizeAssetPayload(params.data);
  const res = await fetch(`${getApiUrl()}/assets`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({
      ...payload,
      status: 'AVAILABLE',
    }),
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
      assetUnitId: payload.assetUnitId || null,
      returnDate: payload.returnDate || null,
      returnedCondition: payload.returnedCondition,
      receivedByMemberId: payload.receivedByMemberId || null,
      returnNotes: payload.returnNotes || null,
      nextStatus: payload.nextStatus || null,
    }),
  });
  return handleResponse<AssetDetail>(res);
}

export async function requestAssetReturnAction(params: {
  orgSlug: string;
  memberId: string;
  assetId: string;
}): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${getApiUrl()}/assets/${params.assetId}/request-return`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<{ success: boolean; message: string }>(res);
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
      estimatedDowntimeHours: payload.estimatedDowntimeHours ?? null,
      operationalCriticalityTier: payload.operationalCriticalityTier,
      cost: payload.cost ?? null,
      status: payload.status,
      conditionBeforeMaintenance: payload.conditionBeforeMaintenance || null,
      notes: payload.notes || null,
      assetUnitId: payload.assetUnitId || null,
    }),
  });
  return handleResponse<AssetDetail>(res);
}

export async function updateAssetMaintenanceAction(params: {
  orgSlug: string;
  memberId: string;
  assetId?: string | null;
  data: AssetMaintenanceUpdateInput;
}): Promise<AssetDetail | null> {
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
  const path = params.assetId
    ? `${getApiUrl()}/assets/${params.assetId}/maintenance/${maintenanceId}`
    : `${getApiUrl()}/assets/maintenance/${maintenanceId}`;
  const res = await fetch(path, {
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

export interface MyTicket {
  id: string;
  ticketId: string;
  ticketMode: TicketMode;
  assetId: string | null;
  assetName: string | null;
  assetCode: string | null;
  category: string | null;
  subject: string | null;
  attachmentsMetadata: TicketAttachmentMetadata[];
  maintenanceType: string;
  issueDescription: string;
  status: string;
  serviceDate: string;
  createdAt: string;
}

export async function createHelpdeskTicketAction(params: {
  orgSlug: string;
  memberId: string;
  data: HelpdeskTicketCreateInput;
}): Promise<MyTicket> {
  const parsed = helpdeskTicketCreateSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(
      JSON.stringify({
        status: 400,
        message: parsed.error.issues[0]?.message ?? 'Validation failed',
      }),
    );
  }

  const res = await fetch(`${getApiUrl()}/assets/helpdesk`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({
      ticketMode: parsed.data.ticketMode,
      assetId: parsed.data.assetId || null,
      assetUnitId: parsed.data.assetUnitId || null,
      category: parsed.data.category || null,
      subject: parsed.data.subject,
      issueDescription: parsed.data.issueDescription,
      attachmentsMetadata: parsed.data.attachmentsMetadata,
      maintenanceType: parsed.data.maintenanceType,
      serviceDate: parsed.data.serviceDate || null,
      expectedCompletionDate: parsed.data.expectedCompletionDate || null,
      estimatedDowntimeHours: parsed.data.estimatedDowntimeHours ?? null,
      operationalCriticalityTier: parsed.data.operationalCriticalityTier,
      conditionBeforeMaintenance: parsed.data.conditionBeforeMaintenance || null,
      notes: parsed.data.notes || null,
    }),
  });
  return handleResponse<MyTicket>(res);
}

export async function withdrawMyTicketAction(params: {
  orgSlug: string;
  memberId: string;
  ticketId: string;
}): Promise<MyTicket> {
  const res = await fetch(`${getApiUrl()}/assets/tickets/mine/${params.ticketId}/withdraw`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<MyTicket>(res);
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

export async function exportAssetsCsvAction(params: {
  orgSlug: string;
  memberId: string;
  reportType: AssetReportType;
  memberIdFilter?: string;
}): Promise<string> {
  const query = buildQuery({
    report_type: params.reportType,
    member_id: params.memberIdFilter,
  });
  const res = await fetch(`${getApiUrl()}/assets/report.csv${query}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  if (!res.ok) return handleResponse<string>(res);
  return res.text();
}

// ── Category CRUD Actions ─────────────────────────────────────────────────────

export async function fetchAssetCategoriesAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<AssetCategoryDefinition[]> {
  const res = await fetch(`${getApiUrl()}/assets/categories`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<AssetCategoryDefinition[]>(res);
}

export async function createAssetCategoryAction(params: {
  orgSlug: string;
  memberId: string;
  data: { name: string; description?: string; assetCode?: string | null };
}): Promise<AssetCategoryDefinition> {
  const res = await fetch(`${getApiUrl()}/assets/categories`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });
  return handleResponse<AssetCategoryDefinition>(res);
}

export async function updateAssetCategoryAction(params: {
  orgSlug: string;
  memberId: string;
  categoryId: string;
  data: { name?: string; description?: string; assetCode?: string | null };
}): Promise<AssetCategoryDefinition> {
  const res = await fetch(`${getApiUrl()}/assets/categories/${params.categoryId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });
  return handleResponse<AssetCategoryDefinition>(res);
}

export async function deleteAssetCategoryAction(params: {
  orgSlug: string;
  memberId: string;
  categoryId: string;
}): Promise<void> {
  const res = await fetch(`${getApiUrl()}/assets/categories/${params.categoryId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<void>(res);
}

export async function createAssetCategoryFieldAction(params: {
  orgSlug: string;
  memberId: string;
  categoryId: string;
  data: {
    fieldName: string;
    fieldType: string;
    fieldOptions?: string[];
    isRequired?: boolean;
    displayOrder?: number;
  };
}): Promise<AssetCategoryFieldDefinition> {
  const res = await fetch(`${getApiUrl()}/assets/categories/${params.categoryId}/fields`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });
  return handleResponse<AssetCategoryFieldDefinition>(res);
}

export async function updateAssetCategoryFieldAction(params: {
  orgSlug: string;
  memberId: string;
  fieldId: string;
  data: {
    fieldName?: string;
    fieldType?: string;
    fieldOptions?: string[] | null;
    isRequired?: boolean;
    displayOrder?: number;
  };
}): Promise<AssetCategoryFieldDefinition> {
  const res = await fetch(`${getApiUrl()}/assets/categories/fields/${params.fieldId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });
  return handleResponse<AssetCategoryFieldDefinition>(res);
}

export async function deleteAssetCategoryFieldAction(params: {
  orgSlug: string;
  memberId: string;
  fieldId: string;
}): Promise<void> {
  const res = await fetch(`${getApiUrl()}/assets/categories/fields/${params.fieldId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<void>(res);
}

// ── Maintenance Tickets Actions ───────────────────────────────────────────────

export interface MaintenanceTicket {
  id: string;
  ticketId: string;
  ticketMode: TicketMode;
  assetId: string | null;
  assetUnitId: string | null;
  assetName: string | null;
  assetCode: string | null;
  assetCondition: string | null;
  category: string | null;
  subject: string | null;
  attachmentsMetadata: TicketAttachmentMetadata[];
  maintenanceType: string;
  issueDescription: string;
  status: string;
  serviceDate: string;
  expectedCompletionDate: string | null;
  estimatedDowntimeHours: number | null;
  operationalCriticalityTier: string | null;
  replacementDecision: string | null;
  createdAt: string;
  loggedByMemberId: string | null;
  loggedByName: string | null;
  assetLifecycleStatus: string | null;
  assetLifecycleStatusLabel: string | null;
  swapPreview: AssetSwapPreview | null;
}

export async function fetchMaintenanceTicketsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<MaintenanceTicket[]> {
  const res = await fetch(`${getApiUrl()}/assets/tickets`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<MaintenanceTicket[]>(res);
}

export async function fetchAssetSwapPreviewAction(params: {
  orgSlug: string;
  memberId: string;
  maintenanceId: string;
}): Promise<AssetSwapPreview> {
  const res = await fetch(`${getApiUrl()}/assets/maintenance/${params.maintenanceId}/swap-preview`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<AssetSwapPreview>(res);
}

export async function revokeAndSwapAssetAction(params: {
  orgSlug: string;
  memberId: string;
  maintenanceId: string;
  data: AssetRevokeSwapInput;
}): Promise<AssetSwapExecutionResult> {
  const parsed = assetRevokeSwapSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(
      JSON.stringify({
        status: 400,
        message: parsed.error.issues[0]?.message ?? 'Validation failed',
      }),
    );
  }

  const res = await fetch(`${getApiUrl()}/assets/maintenance/${params.maintenanceId}/revoke-swap`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify({
      maintenanceId: parsed.data.maintenanceId,
      replacementMode: parsed.data.replacementMode,
      replacementAssetUnitId: parsed.data.replacementAssetUnitId,
      revokeStatus: parsed.data.revokeStatus,
      replacementConditionWhileProviding: parsed.data.replacementConditionWhileProviding,
      providedByMemberId: parsed.data.providedByMemberId || null,
      notes: parsed.data.notes || null,
    } satisfies AssetRevokeSwapPayload),
  });
  return handleResponse<AssetSwapExecutionResult>(res);
}

// ── My Tickets Actions ────────────────────────────────────────────────────────

export async function fetchMyTicketsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<MyTicket[]> {
  const res = await fetch(`${getApiUrl()}/assets/tickets/mine`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse(res);
}

// ── Dashboard Actions ─────────────────────────────────────────────────────────

export async function fetchAssetDashboardAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<import('@/modules/assets/components/dashboard/dashboard.types').DashboardData> {
  const res = await fetch(`${getApiUrl()}/assets/dashboard`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<import('@/modules/assets/components/dashboard/dashboard.types').DashboardData>(res);
}

export async function fetchReturnedAssetsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<import('@/modules/assets/components/dashboard/dashboard.types').ReturnedAssetItem[]> {
  const res = await fetch(`${getApiUrl()}/assets/returned`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<
    import('@/modules/assets/components/dashboard/dashboard.types').ReturnedAssetItem[]
  >(res);
}

// ── Asset ID CRUD Actions ────────────────────────────────────────────────────

export async function fetchAssetBrandModelAnalyticsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<import('@/modules/assets/components/dashboard/dashboard.types').BrandModelInventoryAnalytics> {
  const res = await fetch(`${getApiUrl()}/assets/analytics/brand-models`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<
    import('@/modules/assets/components/dashboard/dashboard.types').BrandModelInventoryAnalytics
  >(res);
}

export async function fetchAssetOsDistributionAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<import('@/modules/assets/components/dashboard/dashboard.types').OsDistributionAnalytics> {
  const res = await fetch(`${getApiUrl()}/assets/analytics/os-distribution`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<
    import('@/modules/assets/components/dashboard/dashboard.types').OsDistributionAnalytics
  >(res);
}

export async function fetchAssetWarrantyFeedAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<import('@/modules/assets/components/dashboard/dashboard.types').WarrantyExpirationFeedData> {
  const res = await fetch(`${getApiUrl()}/assets/warranty/upcoming`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<
    import('@/modules/assets/components/dashboard/dashboard.types').WarrantyExpirationFeedData
  >(res);
}

export async function fetchAssetIdsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<AssetIdDefinition[]> {
  const res = await fetch(`${getApiUrl()}/assets/asset-ids`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<AssetIdDefinition[]>(res);
}

export async function createAssetIdAction(params: {
  orgSlug: string;
  memberId: string;
  data: { assetIdName: string };
}): Promise<AssetIdDefinition> {
  const res = await fetch(`${getApiUrl()}/assets/asset-ids`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });
  return handleResponse<AssetIdDefinition>(res);
}

export async function updateAssetIdAction(params: {
  orgSlug: string;
  memberId: string;
  assetIdId: string;
  data: { assetIdName?: string };
}): Promise<AssetIdDefinition> {
  const res = await fetch(`${getApiUrl()}/assets/asset-ids/${params.assetIdId}`, {
    method: 'PATCH',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });
  return handleResponse<AssetIdDefinition>(res);
}

export async function deleteAssetIdAction(params: {
  orgSlug: string;
  memberId: string;
  assetIdId: string;
}): Promise<void> {
  const res = await fetch(`${getApiUrl()}/assets/asset-ids/${params.assetIdId}`, {
    method: 'DELETE',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<void>(res);
}

// ── Bulk Asset Creation Action ──────────────────────────────────────────────

export async function bulkCreateAssetsAction(params: {
  orgSlug: string;
  memberId: string;
  data: BulkAssetCreateInput;
}): Promise<AssetDetail[]> {
  const res = await fetch(`${getApiUrl()}/assets/bulk-create`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.data),
  });
  return handleResponse<AssetDetail[]>(res);
}

// ── Available Groups Action ────────────────────────────────────────────────

export async function fetchAvailableAssetGroupsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<AvailableAssetGroup[]> {
  const res = await fetch(`${getApiUrl()}/assets/available-groups`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<AvailableAssetGroup[]>(res);
}

// ── Issue Assets Action ────────────────────────────────────────────────────

export async function issueAssetsAction(params: {
  orgSlug: string;
  memberId: string;
  data: AssetIssueInput;
}): Promise<AssetIssueResponse> {
  const parsed = assetIssueSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(
      JSON.stringify({
        status: 400,
        message: parsed.error.issues[0]?.message ?? 'Validation failed',
      }),
    );
  }

  const res = await fetch(`${getApiUrl()}/assets/issue`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<AssetIssueResponse>(res);
}
