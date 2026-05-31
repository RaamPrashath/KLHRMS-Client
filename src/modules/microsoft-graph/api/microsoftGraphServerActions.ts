"use server";

import { hashPassword } from "better-auth/crypto";
import { prisma } from "@/lib/prisma";
import type {
  ConnectionTestResult,
  MicrosoftSettings,
  SyncRunResponse,
  SyncStatusResponse,
} from "@/modules/microsoft-graph/types/microsoftGraphTypes";

function getApiUrl(): string {
  const url = process.env.HRMS_API_URL;
  if (!url) throw new Error("HRMS_API_URL environment variable is not set");
  return url;
}

function buildHeaders(orgSlug: string, memberId: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-organization-slug": orgSlug,
    "x-membership-id": memberId,
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (Array.isArray(body.detail)) {
        detail = body.detail.map((e: { msg?: string }) => e.msg ?? "").join("; ");
      } else {
        detail = body.detail ?? detail;
      }
    } catch {}
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

async function ensureSyncCredentialAccounts(organizationId: string) {
  const users = await prisma.user.findMany({
    where: {
      members: { some: { organizationId } },
      accounts: {
        some: { providerId: "microsoft" },
        none: { providerId: "credential" },
      },
    },
    select: { id: true, email: true },
  });

  if (users.length === 0) return;

  const hashedPassword = await hashPassword("org123");

  await prisma.account.createMany({
    data: users.map((u) => ({
      accountId: u.id,
      providerId: "credential",
      userId: u.id,
      password: hashedPassword,
    })),
    skipDuplicates: true,
  });
}

export async function fetchMicrosoftSettingsAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<MicrosoftSettings> {
  const res = await fetch(
    `${getApiUrl()}/microsoft-graph/settings`,
    {
      method: "GET",
      headers: buildHeaders(params.orgSlug, params.memberId),
      cache: "no-store",
    },
  );
  return handleResponse<MicrosoftSettings>(res);
}

export async function fetchMicrosoftSyncStatusAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<SyncStatusResponse> {
  const res = await fetch(
    `${getApiUrl()}/microsoft-graph/sync-status`,
    {
      method: "GET",
      headers: buildHeaders(params.orgSlug, params.memberId),
      cache: "no-store",
    },
  );
  return handleResponse<SyncStatusResponse>(res);
}

export async function testMicrosoftConnectionAction(params: {
  orgSlug: string;
  memberId: string;
  credentials?: { tenant_id: string; client_id: string; client_secret: string };
}): Promise<ConnectionTestResult> {
  const res = await fetch(
    `${getApiUrl()}/microsoft-graph/test-connection`,
    {
      method: "POST",
      headers: buildHeaders(params.orgSlug, params.memberId),
      body: params.credentials ? JSON.stringify(params.credentials) : undefined,
      cache: "no-store",
    },
  );
  return handleResponse<ConnectionTestResult>(res);
}

export async function saveMicrosoftSettingsAction(params: {
  orgSlug: string;
  memberId: string;
  data: { tenant_id: string; client_id: string; client_secret: string };
}): Promise<MicrosoftSettings> {
  const res = await fetch(
    `${getApiUrl()}/microsoft-graph/settings`,
    {
      method: "PUT",
      headers: buildHeaders(params.orgSlug, params.memberId),
      body: JSON.stringify(params.data),
      cache: "no-store",
    },
  );
  return handleResponse<MicrosoftSettings>(res);
}

export async function syncMicrosoftEmployeesAction(params: {
  orgSlug: string;
  memberId: string;
}): Promise<SyncRunResponse> {
  const res = await fetch(
    `${getApiUrl()}/microsoft-graph/sync`,
    {
      method: "POST",
      headers: buildHeaders(params.orgSlug, params.memberId),
      cache: "no-store",
    },
  );
  const result = await handleResponse<SyncRunResponse>(res);

  const org = await prisma.organization.findUnique({
    where: { slug: params.orgSlug },
    select: { id: true },
  });
  if (org) {
    await ensureSyncCredentialAccounts(org.id);
  }

  return result;
}
