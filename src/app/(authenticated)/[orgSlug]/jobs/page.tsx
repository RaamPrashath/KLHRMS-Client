import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { type RolePermissions } from '@/lib/hrms-roles';
import { JobRequisitionsPage } from '@/modules/jobs/pages/JobRequisitionsPage';
import { fetchDepartmentMetaAction } from '@/modules/departments/api/departmentServerActions';

export default async function JobsPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const { orgSlug } = await params;
  let member: Awaited<ReturnType<typeof requireOrgMembership>>['member'];

  try {
    ({ member } = await requireOrgMembership(session.user.id, orgSlug));
  } catch {
    redirect('/organizations');
  }

  const departmentMeta = await fetchDepartmentMetaAction({
    orgSlug,
    memberId: member.id,
  });
  const departments = departmentMeta.departments.map((department) => ({
    id: department.id,
    name: department.label,
  }));

  return (
    <JobRequisitionsPage
      orgSlug={orgSlug}
      memberId={member.id}
      permissions={(member.role?.permissions as RolePermissions) ?? null}
    />
  );
}
