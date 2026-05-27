import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { type RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';

import { fetchOptionalDepartmentMeta } from '@/modules/jobs/lib/fetchOptionalDepartmentMeta';
import { CreateJobRequisitionPage } from '@/modules/jobs/pages/CreateJobRequisitionPage';

export default async function NewJobPage({
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

  const meta = await fetchOptionalDepartmentMeta({ orgSlug, memberId: member.id });

  const departments = meta?.departments ?? [];
  const orgMembers = meta?.members ?? [];

  return (
    <CreateJobRequisitionPage
      orgSlug={orgSlug}
      memberId={member.id}
      departments={departments}
      orgMembers={orgMembers}
      permissions={(member.role?.permissions as RolePermissions) ?? null}
    />
  );
}
