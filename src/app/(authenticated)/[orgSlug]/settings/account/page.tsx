import { redirect } from 'next/navigation';

import { requireOrgMembership } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { AccountSettingsClient } from '@/modules/settings/components/AccountSettingsClient';

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
    <div className="flex w-full flex-col gap-6">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
          Account Settings
        </h1>
        <p className="mt-1 text-[14px] text-neutral-500">
          Manage your personal account settings.
        </p>
      </div>

      <AccountSettingsClient orgSlug={orgSlug} memberId={memberId} />
    </div>
  );
}
