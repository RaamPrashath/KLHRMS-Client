import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { AtsJobOverviewDashboard } from '@/modules/candidates/components/AtsJobOverviewDashboard';

export default async function CandidatesJobPage({
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
    <AtsJobOverviewDashboard
      orgSlug={orgSlug}
      memberId={member.id}
      jobSlug={jobSlug}
    />
  );
}
