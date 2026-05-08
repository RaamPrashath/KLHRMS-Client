import { redirect } from 'next/navigation';
import { getScope, hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
import { ProjectPageShell } from '@/modules/projects/components/ProjectPageShell';
import { requireServerSession } from '@/lib/server-session';

export default async function ProjectsPage({
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

  if (!permissions || !hasPermission(permissions, 'projects')) redirect(`/${orgSlug}`);

  const canManageProjects =
    getScope(permissions, 'projects', 'create') === 'organization' ||
    getScope(permissions, 'projects', 'edit') === 'organization' ||
    getScope(permissions, 'projects', 'delete') === 'organization';

  return (
    <div className="min-h-full bg-canvas px-8 py-7">
      <ProjectPageShell orgSlug={orgSlug} memberId={memberId!} canManageProjects={canManageProjects} />
    </div>
  );
}
