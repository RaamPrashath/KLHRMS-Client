import { redirect } from 'next/navigation';
import { getScope, hasPermission } from '@/lib/hrms-roles';
import type { RolePermissions } from '@/lib/hrms-roles';
import { requireOrgMembership } from '@/lib/organizations';
import { fetchPipelineJobPostingsAction } from '@/modules/candidates/api/atsServerActions';
import { CandidatesLandingTable } from '@/modules/candidates/components/CandidatesLandingTable';
import { requireServerSession } from '@/lib/server-session';

export default async function CandidatesPage({
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

  if (!permissions || !hasPermission(permissions, 'candidates')) redirect(`/${orgSlug}`);

  const postings = await fetchPipelineJobPostingsAction({ orgSlug, memberId });
  const sorted = [...postings].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="flex flex-col gap-6 flex-1 bg-canvas min-h-full">
      <div className="flex items-center justify-between ml-7 mt-7 mr-7">
        <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">Candidates</h1>
      </div>
      <CandidatesLandingTable orgSlug={orgSlug} postings={sorted} />
    </div>
  );
}
