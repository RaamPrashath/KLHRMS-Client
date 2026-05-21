import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { type RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
import { prisma } from '@/lib/prisma';
import { fetchDepartmentMetaAction } from '@/modules/departments/api/departmentServerActions';
import { EditJobRequisitionPage } from '@/modules/jobs/pages/EditJobRequisitionPage';

export default async function EditJobRequisitionRoute({
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

  const [departmentMeta, members] = await Promise.all([
    fetchDepartmentMetaAction({ orgSlug, memberId: member.id }),
    prisma.member.findMany({
      where: { organizationId: member.organizationId },
      select: {
        id: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { user: { name: 'asc' } },
    }),
  ]);

  const departments = departmentMeta.departments.map((d) => ({ id: d.id, name: d.label }));

  return (
    <EditJobRequisitionPage
      orgSlug={orgSlug}
      memberId={member.id}
      requisitionId={jobSlug}
      departments={departments}
      orgMembers={members.map((orgMember) => ({
        id: orgMember.id,
        name: orgMember.user?.name ?? orgMember.user?.email ?? 'Unknown',
        email: orgMember.user?.email ?? '',
      }))}
      permissions={(member.role?.permissions as RolePermissions) ?? null}
    />
  );
}
