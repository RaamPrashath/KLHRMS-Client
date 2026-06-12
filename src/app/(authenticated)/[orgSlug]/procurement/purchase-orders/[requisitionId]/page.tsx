import { redirect } from 'next/navigation';
import { getScope, hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { ProcurementPurchaseOrderComposer } from '@/modules/procurement/components/ProcurementPurchaseOrderComposer';

export default async function ProcurementPurchaseOrderComposerPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string; requisitionId: string }>;
}>) {
  const session = await requireServerSession();
  const { orgSlug, requisitionId } = await params;

  let memberId: string;
  let permissions: RolePermissions | null;

  try {
    const { member } = await requireOrgMembership(session.user.id, orgSlug);
    memberId = member.id;
    permissions = (member.role?.permissions as RolePermissions) ?? null;
  } catch {
    redirect('/organizations');
  }

  if (!permissions || !hasPermission(permissions, 'procurement')) redirect(`/${orgSlug}`);
  if (getScope(permissions, 'procurement', 'approve') === 'none') redirect(`/${orgSlug}/procurement`);

  return (
    <div className="min-h-full bg-canvas">
      <ProcurementPurchaseOrderComposer
        orgSlug={orgSlug}
        memberId={memberId!}
        requisitionId={requisitionId}
      />
    </div>
  );
}
