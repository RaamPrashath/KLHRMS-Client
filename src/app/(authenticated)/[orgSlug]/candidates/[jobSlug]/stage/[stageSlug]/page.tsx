import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { StageWorkspaceRouterShell } from '@/modules/candidates/components/StageWorkspaceRouterShell';

export default async function CandidateJobStageWorkspacePage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string; jobSlug: string; stageSlug: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const { orgSlug, jobSlug, stageSlug } = await params;
  let member: Awaited<ReturnType<typeof requireOrgMembership>>['member'];
  let org: Awaited<ReturnType<typeof requireOrgMembership>>['org'];

  try {
    ({ member, org } = await requireOrgMembership(session.user.id, orgSlug));
  } catch {
    redirect('/organizations');
  }

  return (
    <StageWorkspaceRouterShell
      orgSlug={orgSlug}
      memberId={member.id}
      organizationId={org.id}
      jobSlug={jobSlug}
      stageSlug={stageSlug}
    />
  );
}
