import { redirect } from 'next/navigation';
import { getScope, hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
import { RecruitmentReportPageShell } from '@/modules/candidates/components/RecruitmentReportPageShell';
import { requireServerSession } from '@/lib/server-session';

export default async function RecruitmentReportPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await requireServerSession();

  const { orgSlug } = await params;

  let memberId: string;
  let permissions: RolePermissions | null;

  try {
    const { member } = await requireOrgMembership(session.user.id, orgSlug);
    memberId = member.id;
    permissions = (member.role?.permissions as RolePermissions) ?? null;
  } catch {
    redirect('/organizations');
  }

  if (!permissions || !hasPermission(permissions, 'jobs')) redirect(`/${orgSlug}`);
  if (getScope(permissions, 'jobs', 'view') !== 'organization') redirect(`/${orgSlug}`);

  return (
    <div className="min-h-full bg-canvas">
      <RecruitmentReportPageShell orgSlug={orgSlug} memberId={memberId} />
    </div>
  );
}
