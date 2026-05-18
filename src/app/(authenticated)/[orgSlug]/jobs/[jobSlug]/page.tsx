import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
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

  const departments = await prisma.department.findMany({
    where: { organizationId: member.organizationId, status: 'ACTIVE' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <JobRequisitionDetailPage
      orgSlug={orgSlug}
      memberId={member.id}
      requisitionId={jobSlug}
      departments={departments}
    />
  );
}
