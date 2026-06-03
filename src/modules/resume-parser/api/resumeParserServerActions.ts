'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import type {
  ResumeParserHistoryResponse,
  ResumeParserProcessResponse,
} from '@/modules/resume-parser/types/resumeParserTypes';

function buildHeaders(orgSlug: string, memberId: string): HeadersInit {
  return {
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
  if (res.ok) return res.json() as Promise<T>;

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  throw new Error(JSON.stringify({ status: res.status, message: errorMessageFromBody(res.status, body), body }));
}

export async function processResumeParserAction(params: {
  orgSlug: string;
  memberId: string;
  formData: FormData;
}): Promise<ResumeParserProcessResponse> {
  const res = await fetch(`${getHrmsApiUrl()}/resume-parser/process`, {
    method: 'POST',
    headers: buildHeaders(params.orgSlug, params.memberId),
    body: params.formData,
  });
  return handleResponse<ResumeParserProcessResponse>(res);
}

export async function fetchResumeParserHistoryAction(params: {
  orgSlug: string;
  memberId: string;
  limit?: number;
}): Promise<ResumeParserHistoryResponse> {
  const searchParams = new URLSearchParams({
    limit: String(params.limit ?? 100),
  });
  const res = await fetch(`${getHrmsApiUrl()}/resume-parser/history?${searchParams.toString()}`, {
    method: 'GET',
    headers: buildHeaders(params.orgSlug, params.memberId),
  });
  return handleResponse<ResumeParserHistoryResponse>(res);
}
