import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { CandidateDetailPage } from './CandidateDetailPage';

export default async function CandidateDetail({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string; jobSlug: string; applicationId: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const { orgSlug, jobSlug, applicationId } = await params;
  let member: Awaited<ReturnType<typeof requireOrgMembership>>['member'];

  try {
    ({ member } = await requireOrgMembership(session.user.id, orgSlug));
  } catch {
    redirect('/organizations');
  }

  return (
    <CandidateDetailPage
      orgSlug={orgSlug}
      memberId={member.id}
      jobSlug={jobSlug}
      applicationId={applicationId}
    />
  );
}
