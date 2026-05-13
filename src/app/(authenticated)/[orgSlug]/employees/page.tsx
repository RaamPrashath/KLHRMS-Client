import { redirect } from 'next/navigation';
import { requireOrgMembership } from '@/lib/organizations';
import { hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { EmployeePageShell } from '@/modules/employees/components/EmployeePageShell';
import { requireServerSession } from '@/lib/server-session';

export default async function EmployeesPage({
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

  // Gate: require any non-"none" action on the "employees" module
  if (!permissions || !hasPermission(permissions, 'employees')) {
    redirect(`/${orgSlug}`);
  }

  return (
    <div className="min-h-full bg-canvas flex flex-col flex-1">
      <EmployeePageShell orgSlug={orgSlug} memberId={memberId!} />
    </div>
  );
}
