import { redirect } from 'next/navigation';
import { getScope, hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
import { DepartmentsPageShell } from '@/modules/departments/components/DepartmentsPageShell';
import { requireServerSession } from '@/lib/server-session';

function hasOrgOrDeptScope(permissions: RolePermissions, module: string, action: string): boolean {
  const scope = getScope(permissions, module, action);
  return scope === 'organization' || scope === 'department';
}

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
    hasOrgOrDeptScope(permissions, 'departments', 'create') ||
    hasOrgOrDeptScope(permissions, 'departments', 'edit') ||
    hasOrgOrDeptScope(permissions, 'departments', 'delete') ||
    hasOrgOrDeptScope(permissions, 'departments', 'approve');

  return (
    <div className="min-h-full bg-canvas">
      <DepartmentsPageShell orgSlug={orgSlug} memberId={memberId!} canManageDepartments={canManageDepartments} />
    </div>
  );
}
