import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { MaintenancePageShell } from '@/modules/assets/components/MaintenancePageShell';

export default async function MaintenancePage({
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

  if (!permissions || !hasPermission(permissions, 'maintenance')) redirect(`/${orgSlug}`);

  return (
    <div className="min-h-full bg-canvas px-5 pt-4">
      <MaintenancePageShell orgSlug={orgSlug} memberId={memberId!} />
    </div>
  );
}
