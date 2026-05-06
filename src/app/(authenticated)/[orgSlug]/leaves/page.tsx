import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { LeavePageShell } from '@/modules/leave/components/LeavePageShell';

export default async function LeavesPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const { orgSlug } = await params;
  let memberId: string;
  try {
    const { member } = await requireOrgMembership(session.user.id, orgSlug);
    memberId = member.id;
  } catch {
    redirect('/organizations');
  }

  return (
    <div className="min-h-full">
      <LeavePageShell orgSlug={orgSlug} memberId={memberId!} />
    </div>
  );
}
