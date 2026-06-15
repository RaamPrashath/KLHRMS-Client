'use server';

import { getHrmsApiUrl } from '@/lib/deployment-env';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';

export interface FormFieldConfig {
  id: string;
  type: 'short_text' | 'long_text' | 'dropdown' | 'checkbox' | 'date';
  label: string;
  required: boolean;
  options?: string[];
}

function getApiUrl(): string {
  return getHrmsApiUrl();
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
  }

  throw new Error(JSON.stringify({ status: res.status, message }));
}

export async function updateJobPostingFormFieldsAction(params: {
  orgSlug: string;
  postingId: string;
  formFields: FormFieldConfig[];
}): Promise<{ success: boolean }> {
  const { member } = await getCurrentOrgMember(params.orgSlug);
  const res = await fetch(`${getApiUrl()}/jobs/postings/${params.postingId}/form-fields`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-organization-slug': params.orgSlug,
      'x-membership-id': member.id,
    },
    body: JSON.stringify({ formFields: params.formFields }),
  });
  await handleResponse(res);
  return { success: true };
}
