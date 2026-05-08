'use server';

import type { PublicCareerApplicationInput } from '@/modules/jobs/schema/publicCareerSchemas';
import type {
  PublicCareerApplicationResult,
  PublicCareerPosting,
} from '@/modules/jobs/types/publicCareerTypes';

function getApiUrl(): string {
  const url = process.env.HRMS_API_URL;
  if (!url) throw new Error('HRMS_API_URL environment variable is not set');
  return url;
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
    // ignore parse failures
  }

  throw new Error(JSON.stringify({ status: res.status, message }));
}

export async function fetchPublicCareerPostingsAction(): Promise<PublicCareerPosting[]> {
  const res = await fetch(`${getApiUrl()}/jobs/public/postings`, {
    method: 'GET',
    cache: 'no-store',
  });
  return handleResponse<PublicCareerPosting[]>(res);
}

export async function fetchPublicCareerPostingAction(jobId: string): Promise<PublicCareerPosting> {
  const res = await fetch(`${getApiUrl()}/jobs/public/postings/${jobId}`, {
    method: 'GET',
    cache: 'no-store',
  });
  return handleResponse<PublicCareerPosting>(res);
}

export async function createPublicCareerApplicationAction(params: {
  jobId: string;
  data: PublicCareerApplicationInput;
}): Promise<PublicCareerApplicationResult> {
  const res = await fetch(`${getApiUrl()}/jobs/public/postings/${params.jobId}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      firstName: params.data.firstName,
      lastName: params.data.lastName,
      email: params.data.email,
      phone: params.data.phone || null,
      linkedinUrl: params.data.linkedinUrl || null,
      resumeUrl: params.data.resumeUrl,
      coverLetter: params.data.coverLetter || null,
    }),
  });
  return handleResponse<PublicCareerApplicationResult>(res);
}
