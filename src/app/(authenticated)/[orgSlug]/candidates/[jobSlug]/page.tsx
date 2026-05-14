import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { fetchPipelineJobPostingsAction } from '@/modules/candidates/api/atsServerActions';
import { CandidatesJobPageClient } from './CandidatesJobPageClient';

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

  const postings = await fetchPipelineJobPostingsAction({ orgSlug, memberId: member.id });
  const matched = postings.find((p) => p.slug === jobSlug);
  if (!matched) redirect(`/${orgSlug}/candidates`);

  return (
    <CandidatesJobPageClient
      orgSlug={orgSlug}
      memberId={member.id}
      jobPostingId={matched.id}
      jobPostings={postings}
    />
  );
}
