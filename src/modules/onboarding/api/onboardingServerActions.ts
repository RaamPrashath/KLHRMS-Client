'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import { hashPassword } from 'better-auth/crypto';
import { prisma } from '@/lib/prisma';
import {
  onboardingAssignCredentialsPayloadSchema,
  onboardingSendPayloadSchema,
  type OnboardingAssignCredentialsPayload,
  type OnboardingSendPayload,
} from '@/modules/onboarding/schema/onboardingSchemas';
import type {
  AcceptedOnboardingWorkspace,
  OnboardingAssignCredentialsResponse,
  OnboardingPublic,
  OnboardingSendResponse,
  OnboardWorkspace,
  Role,
} from '@/modules/onboarding/types/onboardingTypes';

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

export async function fetchAcceptedOnboardingWorkspaceAction(params: {
  orgSlug: string;
  memberId: string;
  jobSlug: string;
  stageSlug: string;
}): Promise<AcceptedOnboardingWorkspace> {
  const res = await fetch(
    `${getApiUrl()}/onboarding/pipeline/jobs/${encodeURIComponent(params.jobSlug)}/stages/${encodeURIComponent(params.stageSlug)}/workspace`,
    {
      method: 'GET',
      headers: buildHeaders(params.orgSlug, params.memberId),
      cache: 'no-store',
    },
  );
  return handleResponse<AcceptedOnboardingWorkspace>(res);
}

export async function sendOnboardingRequestsAction(params: {
  orgSlug: string;
  memberId: string;
  jobSlug: string;
  stageSlug: string;
  data: OnboardingSendPayload;
}): Promise<OnboardingSendResponse> {
  const parsed = onboardingSendPayloadSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(
    `${getApiUrl()}/onboarding/pipeline/jobs/${encodeURIComponent(params.jobSlug)}/stages/${encodeURIComponent(params.stageSlug)}/send-requests`,
    {
      method: 'POST',
      headers: buildHeaders(params.orgSlug, params.memberId),
      body: JSON.stringify(parsed.data),
    },
  );
  return handleResponse<OnboardingSendResponse>(res);
}

export async function fetchOnboardWorkspaceAction(params: {
  orgSlug: string;
  memberId: string;
  jobSlug: string;
  stageSlug: string;
}): Promise<OnboardWorkspace> {
  const res = await fetch(
    `${getApiUrl()}/onboarding/pipeline/jobs/${encodeURIComponent(params.jobSlug)}/stages/${encodeURIComponent(params.stageSlug)}/onboard-workspace`,
    {
      method: 'GET',
      headers: buildHeaders(params.orgSlug, params.memberId),
      cache: 'no-store',
    },
  );
  return handleResponse<OnboardWorkspace>(res);
}

export async function assignOnboardingCredentialsAction(params: {
  orgSlug: string;
  memberId: string;
  recordId: string;
  data: OnboardingAssignCredentialsPayload;
}): Promise<OnboardingAssignCredentialsResponse> {
  const parsed = onboardingAssignCredentialsPayloadSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }
  const res = await fetch(
    `${getApiUrl()}/onboarding/records/${encodeURIComponent(params.recordId)}/assign`,
    {
      method: 'POST',
      headers: buildHeaders(params.orgSlug, params.memberId),
      body: JSON.stringify(parsed.data),
    },
  );
  return handleResponse<OnboardingAssignCredentialsResponse>(res);
}

export async function provisionCredentialsPasswordAction(params: {
  orgSlug: string;
  memberId: string;
  recordId: string;
}): Promise<{ password: string; email: string; candidateName: string }> {
  const res = await fetch(
    `${getApiUrl()}/onboarding/records/${encodeURIComponent(params.recordId)}/provision-password`,
    {
      method: 'GET',
      headers: buildHeaders(params.orgSlug, params.memberId),
      cache: 'no-store',
    },
  );
  return handleResponse<{ password: string; email: string; candidateName: string }>(res);
}

export async function sendCredentialsAction(params: {
  orgSlug: string;
  memberId: string;
  recordId: string;
  password: string;
}): Promise<{ status: string }> {
  const res = await fetch(
    `${getApiUrl()}/onboarding/records/${encodeURIComponent(params.recordId)}/send-credentials`,
    {
      method: 'POST',
      headers: buildHeaders(params.orgSlug, params.memberId),
      body: JSON.stringify({ password: params.password }),
    },
  );
  return handleResponse<{ status: string }>(res);
}

export async function fetchOnboardingPublicAction(token: string): Promise<OnboardingPublic> {
  const res = await fetch(
    `${getApiUrl()}/public/onboarding/${encodeURIComponent(token)}`,
    {
      method: 'GET',
      cache: 'no-store',
    },
  );
  return handleResponse<OnboardingPublic>(res);
}

export async function submitOnboardingDocumentsAction(params: {
  token: string;
  data: { aadharBase64: string; aadharFileName?: string; panBase64: string; panFileName?: string };
}): Promise<{ status: string; message: string }> {
  const res = await fetch(
    `${getApiUrl()}/public/onboarding/${encodeURIComponent(params.token)}/submit`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params.data),
    },
  );
  return handleResponse<{ status: string; message: string }>(res);
}

export async function fetchRolesAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<Role[]> {
  const res = await fetch(`${getApiUrl()}/roles`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
    cache: 'no-store',
  });
  return handleResponse<Role[]>(res);
}

export async function assignCredentialsAndCreateUserAction(params: {
  orgSlug: string;
  memberId: string;
  recordId: string;
  data: OnboardingAssignCredentialsPayload;
  organizationId: string;
}): Promise<{ status: string }> {
  const parsed = onboardingAssignCredentialsPayloadSchema.safeParse(params.data);
  if (!parsed.success) {
    throw new Error(JSON.stringify({ status: 400, message: parsed.error.issues[0]?.message ?? 'Validation failed' }));
  }

  // Step 1: Assign role + email on backend, get generated password
  await assignOnboardingCredentialsAction({
    orgSlug: params.orgSlug,
    memberId: params.memberId,
    recordId: params.recordId,
    data: parsed.data,
  });

  const provisioned = await provisionCredentialsPasswordAction({
    orgSlug: params.orgSlug,
    memberId: params.memberId,
    recordId: params.recordId,
  });

  const password = provisioned.password;
  const email = parsed.data.email;

  // Step 2: Create User + Account + Member via Prisma
  const hashedPassword = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email,
      emailVerified: true,
      onboarded: true,
      name: provisioned.candidateName || email.split('@')[0],
      accounts: {
        create: {
          accountId: email,
          providerId: 'credential',
          password: hashedPassword,
        },
      },
    },
  });

  await prisma.member.create({
    data: {
      organizationId: params.organizationId,
      userId: user.id,
      roleId: parsed.data.roleId,
    },
  });

  // Step 3: Send credentials email
  const result = await sendCredentialsAction({
    orgSlug: params.orgSlug,
    memberId: params.memberId,
    recordId: params.recordId,
    password,
  });

  return result;
}
