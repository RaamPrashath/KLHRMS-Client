import { redirect } from 'next/navigation';
import { requireOrgMembership } from '@/lib/organizations';
import { RolesPageShell } from '@/modules/roles/components/RolesPageShell';
import { requireServerSession } from '@/lib/server-session';

export default async function RolesPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await requireServerSession();

  const { orgSlug } = await params;
  let memberId: string;

  try {
    const { member } = await requireOrgMembership(session.user.id, orgSlug);
    memberId = member.id;
  } catch {
    redirect('/organizations');
  }

  return (
    <div className="min-h-full">
      <div className="px-6 py-6 flex flex-col gap-6 max-w-6xl">
        <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">
          Roles &amp; Permissions
        </h1>
        <RolesPageShell orgSlug={orgSlug} memberId={memberId!} />
      </div>
    </div>
  );
}
