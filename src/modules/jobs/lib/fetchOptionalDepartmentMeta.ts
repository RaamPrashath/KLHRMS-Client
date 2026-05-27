import { fetchJobFormMetaAction } from '@/modules/jobs/api/jobRequisitionServerActions';

export async function fetchOptionalDepartmentMeta(params: {
  orgSlug: string;
  memberId: string;
}): Promise<Awaited<ReturnType<typeof fetchJobFormMetaAction>> | null> {
  try {
    return await fetchJobFormMetaAction(params);
  } catch (error) {
    try {
      const parsed = JSON.parse(error instanceof Error ? error.message : '{}');
      if (parsed.status === 403) return null;
    } catch {
      // Re-throw the original error below.
    }
    throw error;
  }
}
