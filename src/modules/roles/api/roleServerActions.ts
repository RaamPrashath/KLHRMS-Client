'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import { type RoleResponse, type ApiError } from '@/modules/roles/types/role';
import {
  roleCreateSchema,
  roleUpdateSchema,
  type RoleCreateInput,
  type RoleUpdateInput,
} from '@/modules/roles/schema/roleSchemas';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
    return res.json() as Promise<T>;
  }

  let message = `Request failed with status ${res.status}`;
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') message = body.detail;
    else if (typeof body?.message === 'string') message = body.message;
  } catch {
    // ignore parse errors — use default message
  }

  const error: ApiError = { status: res.status, message };
  throw error;
}

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function fetchRolesAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<RoleResponse[]> {
  const { orgSlug, memberId } = params;
  const res = await fetch(`${getApiUrl()}/roles`, {
    method: 'GET',
    headers: buildHeaders(orgSlug, memberId),
    cache: 'no-store',
  });
  return handleResponse<RoleResponse[]>(res);
}

export async function createRoleAction(params: {
  orgSlug: string;
  memberId: string;
  data: RoleCreateInput;
}): Promise<RoleResponse> {
  const { orgSlug, memberId, data } = params;

  // Validate before sending
  const parsed = roleCreateSchema.safeParse(data);
  if (!parsed.success) {
    const error: ApiError = {
      status: 400,
      message: parsed.error.issues[0]?.message ?? 'Validation failed',
    };
    throw error;
  }

  const res = await fetch(`${getApiUrl()}/roles`, {
    method: 'POST',
    headers: buildHeaders(orgSlug, memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<RoleResponse>(res);
}

export async function updateRoleAction(params: {
  orgSlug: string;
  memberId: string;
  roleId: string;
  data: RoleUpdateInput;
}): Promise<RoleResponse> {
  const { orgSlug, memberId, roleId, data } = params;

  // Validate before sending
  const parsed = roleUpdateSchema.safeParse(data);
  if (!parsed.success) {
    const error: ApiError = {
      status: 400,
      message: parsed.error.issues[0]?.message ?? 'Validation failed',
    };
    throw error;
  }

  const res = await fetch(`${getApiUrl()}/roles/${roleId}`, {
    method: 'PATCH',
    headers: buildHeaders(orgSlug, memberId),
    body: JSON.stringify(parsed.data),
  });
  return handleResponse<RoleResponse>(res);
}

export async function deleteRoleAction(params: {
  orgSlug: string;
  memberId: string;
  roleId: string;
}): Promise<void> {
  const { orgSlug, memberId, roleId } = params;
  const res = await fetch(`${getApiUrl()}/roles/${roleId}`, {
    method: 'DELETE',
    headers: buildHeaders(orgSlug, memberId),
  });
  return handleResponse<void>(res);
}
