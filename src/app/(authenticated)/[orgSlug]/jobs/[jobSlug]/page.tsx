import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { type RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';

import { fetchOptionalDepartmentMeta } from '@/modules/jobs/lib/fetchOptionalDepartmentMeta';
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

  const meta = await fetchOptionalDepartmentMeta({ orgSlug, memberId: member.id });

  return (
    <JobRequisitionDetailPage
      orgSlug={orgSlug}
      memberId={member.id}
      requisitionId={jobSlug}
      departments={meta?.departments ?? []}
      orgMembers={meta?.members ?? []}
      permissions={(member.role?.permissions as RolePermissions) ?? null}
    />
  );
}
