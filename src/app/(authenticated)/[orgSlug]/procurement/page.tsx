import { redirect } from 'next/navigation';
import { getScope, hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { ProcurementPageShell } from '@/modules/procurement/components/ProcurementPageShell';

export default async function ProcurementPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ requisition?: string }>;
}>) {
  const session = await requireServerSession();
  const { orgSlug } = await params;
  const { requisition } = await searchParams;

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

  const canCreateProcurement = getScope(permissions, 'procurement', 'create') !== 'none';
  const canApproveProcurement = getScope(permissions, 'procurement', 'approve') !== 'none';

  return (
    <div className="min-h-full bg-canvas px-5 pt-4 pb-6">
      <ProcurementPageShell
        orgSlug={orgSlug}
        memberId={memberId!}
        canCreateProcurement={canCreateProcurement}
        canApproveProcurement={canApproveProcurement}
        initialRequisitionId={requisition ?? null}
      />
    </div>
  );
}
