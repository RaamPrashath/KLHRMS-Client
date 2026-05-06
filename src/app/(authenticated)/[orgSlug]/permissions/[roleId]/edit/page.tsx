import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { fetchRolesAction } from '@/modules/roles/api/roleServerActions';
import { RoleForm } from '@/modules/roles/components/RoleForm';
import { type RoleResponse } from '@/modules/roles/types/role';

export default async function EditRolePage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string; roleId: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { orgSlug, roleId } = await params;
  let memberId: string;
  let role: RoleResponse | undefined;

  try {
    const { member } = await requireOrgMembership(session.user.id, orgSlug);
    memberId = member.id;
  } catch {
    redirect('/organizations');
  }

  try {
    const roles = await fetchRolesAction({ orgSlug, memberId: memberId! });
    role = roles.find((r) => r.id === roleId);
  } catch {
    // fall through — role will be undefined
  }

  if (!role) {
    redirect(`/${orgSlug}/permissions`);
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
            Edit role
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Update the name or permissions for{' '}
            <span className="font-medium text-neutral-700">{role.name}</span>.
          </p>
        </div>

        {/* Form card */}
        <div className="bg-surface border border-neutral-100 rounded-xl shadow-(--shadow-1) p-6">
          <RoleForm
            mode="edit"
            orgSlug={orgSlug}
            memberId={memberId!}
            initialRole={role}
          />
        </div>
      </div>
    </div>
  );
}
