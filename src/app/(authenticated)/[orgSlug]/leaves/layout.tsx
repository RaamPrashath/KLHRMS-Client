import { redirect } from 'next/navigation';

import { requireOrgMembership } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { fetchLeavePageContextAction } from '@/modules/leave/api/leaveServerActions';
import { LeaveSectionShell } from '@/modules/leave/components/LeaveSectionShell';
import { canViewLeaves, resolveLeavePermissions } from '@/modules/leave/utils/leavePermissions';

export default async function LeavesLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await requireServerSession();

  const { orgSlug } = await params;
  let memberId: string;

  try {
    const { member } = await requireOrgMembership(session.user.id, orgSlug);
    memberId = member.id;
  } catch {
    redirect('/organizations');
  }

  const leaveContext = await fetchLeavePageContextAction({ orgSlug, memberId });
  const permissions = resolveLeavePermissions(leaveContext.permissions);
  if (!canViewLeaves(permissions.view)) {
    return <div className="flex min-h-[70vh] items-center justify-center text-sm text-neutral-500">You don&apos;t have permission to use this page.</div>;
  }

  return (
    <LeaveSectionShell
      orgSlug={orgSlug}
      memberId={memberId}
      initialMembers={leaveContext.members}
      initialPermissions={leaveContext.permissions}
    >
      {children}
    </LeaveSectionShell>
  );
}
