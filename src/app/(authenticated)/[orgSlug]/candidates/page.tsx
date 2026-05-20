import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { fetchPipelineJobPostingsAction } from '@/modules/candidates/api/atsServerActions';
import { CandidatesLandingTable } from '@/modules/candidates/components/CandidatesLandingTable';

export default async function CandidatesPage({
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

  const postings = await fetchPipelineJobPostingsAction({ orgSlug, memberId: member.id });
  const sorted = [...postings].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="min-h-full bg-canvas">
      <div className="flex min-h-full flex-1 flex-col gap-6">
        <div className="flex items-start justify-between px-4 pb-2 pt-8 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
            Candidates
          </h1>
        </div>
        <CandidatesLandingTable orgSlug={orgSlug} postings={sorted} />
      </div>
    </div>
  );
}
