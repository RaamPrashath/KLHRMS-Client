import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';

export default async function CandidatesOverviewPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string; jobSlug: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const { orgSlug } = await params;

  try {
    await requireOrgMembership(session.user.id, orgSlug);
  } catch {
    redirect('/organizations');
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Overview</h1>
    </div>
  );
}
