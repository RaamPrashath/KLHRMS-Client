import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import type { RolePermissions } from '@/modules/roles/types/role';
import { CandidatesJobPageClient } from '../CandidatesJobPageClient';

export default async function CandidatesTablePage({
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

  return (
    <CandidatesJobPageClient
      orgSlug={orgSlug}
      memberId={member.id}
      jobSlug={jobSlug}
      defaultView="table"
      permissions={(member.role?.permissions as RolePermissions) ?? null}
    />
  );
}
