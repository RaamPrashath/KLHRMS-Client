import { redirect } from 'next/navigation';
import { getScope, hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
import { DepartmentsPageShell } from '@/modules/departments/components/DepartmentsPageShell';
import { requireServerSession } from '@/lib/server-session';

export default async function DepartmentsPage({
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

  if (!permissions || !hasPermission(permissions, 'departments')) redirect(`/${orgSlug}`);

  const canManageDepartments =
    getScope(permissions, 'departments', 'create') === 'organization' ||
    getScope(permissions, 'departments', 'edit') === 'organization' ||
    getScope(permissions, 'departments', 'delete') === 'organization';

  return (
    <div className="min-h-full bg-canvas">
      <DepartmentsPageShell orgSlug={orgSlug} memberId={memberId!} canManageDepartments={canManageDepartments} />
    </div>
  );
}
