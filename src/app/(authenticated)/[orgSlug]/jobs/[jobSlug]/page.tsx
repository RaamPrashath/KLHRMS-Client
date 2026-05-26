import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { type RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';

import { fetchDepartmentMetaAction } from '@/modules/departments/api/departmentServerActions';
import { JobRequisitionDetailPage } from '@/modules/jobs/pages/JobRequisitionDetailPage';

async function fetchOptionalDepartmentMeta(params: {
  orgSlug: string;
  memberId: string;
}): Promise<Awaited<ReturnType<typeof fetchDepartmentMetaAction>> | null> {
  try {
    return await fetchDepartmentMetaAction(params);
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

export default async function JobRequisitionPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const { orgSlug, jobSlug } = await params;
  let member: Awaited<ReturnType<typeof requireOrgMembership>>['member'];

  try {
    ({ member } = await requireOrgMembership(session.user.id, orgSlug));
  } catch {
    redirect('/organizations');
  }

  const meta = await fetchOptionalDepartmentMeta({ orgSlug, memberId: member.id });

  return (
    <JobRequisitionDetailPage
      orgSlug={orgSlug}
      memberId={member.id}
      requisitionId={jobSlug}
      departments={(meta?.departments ?? []).map((department) => ({
        id: department.id,
        name: department.label,
      }))}
      orgMembers={(meta?.members ?? []).map((orgMember) => ({
        id: orgMember.id,
        name: orgMember.label,
        email: orgMember.email ?? '',
      }))}
      permissions={(member.role?.permissions as RolePermissions) ?? null}
    />
  );
}
