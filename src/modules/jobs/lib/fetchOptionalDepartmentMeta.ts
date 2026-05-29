import { fetchJobFormMetaAction } from '@/modules/jobs/api/jobRequisitionServerActions';

export async function fetchOptionalDepartmentMeta(params: {
  orgSlug: string;
  memberId: string;
}): Promise<Awaited<ReturnType<typeof fetchJobFormMetaAction>> | null> {
  try {
    return await fetchJobFormMetaAction(params);
  } catch {
    return null;
  }
}
