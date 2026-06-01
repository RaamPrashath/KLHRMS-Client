import { redirect } from 'next/navigation';
import { requireOrgMembership } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { UserPasswordTab } from '@/modules/settings/components/UserPasswordTab';

export default async function AccountSettingsPage({
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
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-10">
        <h1 className="text-[34px] font-semibold tracking-tight text-neutral-900">Account Settings</h1>
        <p className="mt-1.5 text-[17px] text-neutral-500 leading-snug">
          Manage your personal account settings.
        </p>
      </div>
      <UserPasswordTab orgSlug={orgSlug} memberId={memberId} />
    </div>
  );
}
