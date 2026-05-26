import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { StageWorkspacePageShell } from '@/modules/candidates/components/StageWorkspacePageShell';

export default async function CandidateJobStageWorkspacePage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string; jobSlug: string; stageSlug: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const { orgSlug, jobSlug, stageSlug } = await params;
  let member: Awaited<ReturnType<typeof requireOrgMembership>>['member'];

  try {
    ({ member } = await requireOrgMembership(session.user.id, orgSlug));
  } catch {
    redirect('/organizations');
  }

  return (
    <StageWorkspacePageShell
      orgSlug={orgSlug}
      memberId={member.id}
      jobSlug={jobSlug}
      stageSlug={stageSlug}
    />
  );
}
