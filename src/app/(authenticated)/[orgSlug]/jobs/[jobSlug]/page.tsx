import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { type RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
import { prisma } from '@/lib/prisma';
import { JobRequisitionDetailPage } from '@/modules/jobs/pages/JobRequisitionDetailPage';

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

  const [departments, members] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: member.organizationId, status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.member.findMany({
      where: { organizationId: member.organizationId },
      select: {
        id: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { user: { name: 'asc' } },
    }),
  ]);

  return (
    <JobRequisitionDetailPage
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
