import { redirect } from 'next/navigation';
import { getScope, hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { AssetsPageShell } from '@/modules/assets/components/AssetsPageShell';

export default async function AssetsPage({
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

  if (!permissions || !hasPermission(permissions, 'assets')) redirect(`/${orgSlug}`);

  const canManageAssets =
    getScope(permissions, 'assets', 'create') === 'organization' ||
    getScope(permissions, 'assets', 'edit') === 'organization' ||
    getScope(permissions, 'assets', 'delete') === 'organization';

  return (
    <div className="min-h-full bg-canvas px-5 pt-4">
      <AssetsPageShell orgSlug={orgSlug} memberId={memberId!} canManageAssets={canManageAssets} />
    </div>
  );
}
