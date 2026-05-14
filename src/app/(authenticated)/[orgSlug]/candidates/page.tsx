import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { fetchPipelineJobPostingsAction } from '@/modules/candidates/api/atsServerActions';

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
  const sorted = postings.sort((a, b) => a.title.localeCompare(b.title));
  const first = sorted[0];

  if (first?.slug) {
    redirect(`/${orgSlug}/candidates/${first.slug}`);
  }

  return (
    <div className="min-h-full bg-canvas px-6 mt-6">
      <div className="rounded-xl border border-neutral-100 bg-white p-8 text-center text-sm text-neutral-500 shadow-sm">
        No job postings are available yet.
      </div>
    </div>
  );
}
