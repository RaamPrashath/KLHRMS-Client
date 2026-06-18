import { redirect } from 'next/navigation';
import { requireOrgMembership } from '@/lib/organizations';
import { getScope, hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { DeactivatedEmployeesPageShell } from '@/modules/employees/components/DeactivatedEmployeesPageShell';
import { requireServerSession } from '@/lib/server-session';

export default async function DeactivatedEmployeesPage({
  params,
}: Readonly<{ params: Promise<{ orgSlug: string }> }>) {
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

  if (!permissions || !hasPermission(permissions, 'employees')) {
    redirect(`/${orgSlug}`);
  }

  const canEdit = permissions
    ? getScope(permissions, 'employees', 'edit') !== 'none' && getScope(permissions, 'permission', 'edit') !== 'none'
    : false;

  if (!canEdit) {
    redirect(`/${orgSlug}/employees`);
  }

  return (
    <div className="min-h-full bg-canvas flex flex-col flex-1">
      <DeactivatedEmployeesPageShell orgSlug={orgSlug} memberId={memberId} />
    </div>
  );
}
