import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { StageWorkspacePageShell } from '@/modules/candidates/components/StageWorkspacePageShell';

export default async function StageWorkspacePage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orgSlug: string; stageSlug: string }>;
  searchParams?: Promise<{ jobSlug?: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const { orgSlug, stageSlug } = await params;
  let member: Awaited<ReturnType<typeof requireOrgMembership>>['member'];

  try {
    ({ member } = await requireOrgMembership(session.user.id, orgSlug));
  } catch {
    redirect('/organizations');
  }

  const resolvedSearchParams = await searchParams;

  return (
    <StageWorkspacePageShell
      orgSlug={orgSlug}
      memberId={member.id}
      stageSlug={stageSlug}
      jobSlug={resolvedSearchParams?.jobSlug ?? null}
    />
  );
}
