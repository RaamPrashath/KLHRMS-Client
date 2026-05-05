import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { RolesPageShell } from '@/modules/roles/components/RolesPageShell';

export default async function RolesPage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect('/login');
  }

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
        {/* Page header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
            Roles &amp; Permissions
          </h1>
          <p className="text-sm text-neutral-500">
            Define access levels and control what each role can see and do.
          </p>
        </div>

        {/* Client shell — search, grid, slide-over, dialogs */}
        <RolesPageShell orgSlug={orgSlug} memberId={memberId!} />
      </div>
    </div>
  );
}
