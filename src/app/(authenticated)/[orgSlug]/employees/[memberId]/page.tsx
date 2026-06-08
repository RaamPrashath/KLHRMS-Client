import { redirect } from 'next/navigation';

import { requireServerSession } from '@/lib/server-session';
import { requireOrgMembership } from '@/lib/organizations';
import { hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { EmployeeDetailPageShell } from '@/modules/employees/components/EmployeeDetailPageShell';

export default async function EmployeeDetailPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string; memberId: string }>;
}>) {
  const session = await requireServerSession();
  if (!session?.user?.id) redirect('/login');

  const { orgSlug, memberId: targetMemberId } = await params;

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

  return (
    <div className="min-h-full bg-canvas flex flex-col flex-1">
      <EmployeeDetailPageShell
        orgSlug={orgSlug}
        memberId={memberId!}
        permissions={permissions}
        targetMemberId={targetMemberId}
      />
    </div>
  );
}
