'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import type { AssetExportPayload, AssetExportDomain } from '@/modules/assets/types/assetTypes';

function getApiUrl(): string {
  return getHrmsApiUrl().replace(/\/$/, '');
}

function buildHeaders(orgSlug: string, memberId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-organization-slug': orgSlug,
    'x-membership-id': memberId,
  };
}

const ENDPOINT_MAP: Record<AssetExportDomain, string> = {
  register: '/assets/export/register',
  issued: '/assets/export/issued',
  returned: '/assets/export/returned',
  inventory: '/assets/export/inventory',
};

export async function exportAssetsInlineAction(params: {
  orgSlug: string;
  memberId: string;
  domain: AssetExportDomain;
  payload: AssetExportPayload;
}): Promise<Blob> {
  const endpoint = ENDPOINT_MAP[params.domain];
  const res = await fetch(`${getApiUrl()}${endpoint}`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: JSON.stringify(params.payload),
  });

  if (!res.ok) {
    let message = `Export failed with status ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string') message = body.detail;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  return res.blob();
}
