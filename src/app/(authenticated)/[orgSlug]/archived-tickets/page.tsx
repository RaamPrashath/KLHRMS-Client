import { redirect } from 'next/navigation';
import { hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { ArchivedTicketsPageShell } from '@/modules/assets/components/ArchivedTicketsPageShell';

export default async function ArchivedTicketsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ ticketMode?: string }>;
}>) {
  const session = await requireServerSession();
  const { orgSlug } = await params;
  const { ticketMode } = await searchParams;

  let memberId: string;
  let permissions: RolePermissions | null;

  try {
    const { member } = await requireOrgMembership(session.user.id, orgSlug);
    memberId = member.id;
    permissions = (member.role?.permissions as RolePermissions) ?? null;
  } catch {
    redirect('/organizations');
  }

  const hasMaintenance = hasPermission(permissions, 'maintenance');
  const hasHelpdesk = hasPermission(permissions, 'helpdesk');
  if (!hasMaintenance && !hasHelpdesk) redirect(`/${orgSlug}`);

  return (
    <ArchivedTicketsPageShell
      orgSlug={orgSlug}
      memberId={memberId!}
      initialTicketMode={ticketMode}
    />
  );
}
