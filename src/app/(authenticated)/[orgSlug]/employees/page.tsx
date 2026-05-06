import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { EmployeePageShell } from '@/modules/employees/components/EmployeePageShell';

export default async function EmployeesPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

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
    <div className="min-h-full bg-canvas px-8 py-7">
      <EmployeePageShell orgSlug={orgSlug} memberId={memberId!} />
    </div>
  );
}
