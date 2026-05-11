import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { requireOrgMembership } from '@/lib/organizations';
import { type RolePermissions } from '@/lib/hrms-roles';
import { JobRequisitionPageShell } from '@/modules/jobs/components/JobRequisitionPageShell';

export default async function JobRequisitionsPage({
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

  const departments = await prisma.department.findMany({
    where: {
      organizationId: member.organizationId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return (
    <JobRequisitionPageShell
      orgSlug={orgSlug}
      memberId={member.id}
      departments={departments}
      permissions={(member.role?.permissions as RolePermissions) ?? null}
      ownedOnly
    />
  );
}
