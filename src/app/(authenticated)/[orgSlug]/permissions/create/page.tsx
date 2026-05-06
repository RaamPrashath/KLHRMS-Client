import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { RoleForm } from '@/modules/roles/components/RoleForm';

export default async function CreateRolePage({
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
    <div className="bg-canvas min-h-full">
      <div className="px-6 py-6 flex flex-col gap-6 max-w-3xl">
        {/* Back link */}
        <Link
          href={`/${orgSlug}/permissions`}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors duration-100 motion-reduce:transition-none w-fit"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Back to roles
        </Link>

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
            Create role
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Define a name and set permissions for the new role.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-surface border border-neutral-100 rounded-xl shadow-(--shadow-1) p-6">
          <RoleForm
            mode="create"
            orgSlug={orgSlug}
            memberId={memberId!}
          />
        </div>
      </div>
    </div>
  );
}
