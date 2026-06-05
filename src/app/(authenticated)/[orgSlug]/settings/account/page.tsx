import { redirect } from 'next/navigation';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { requireOrgMembership } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { UserPasswordTab } from '@/modules/settings/components/UserPasswordTab';
import { UserPersonalDetailsTab } from '@/modules/settings/components/UserPersonalDetailsTab';

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

      <Tabs defaultValue="personal-details" className="w-full">
        <TabsList>
          <TabsTrigger value="personal-details">Personal details</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="personal-details" className="mt-6 max-w-2xl">
          <UserPersonalDetailsTab orgSlug={orgSlug} memberId={memberId} />
        </TabsContent>

        <TabsContent value="password" className="mt-6 max-w-2xl">
          <UserPasswordTab orgSlug={orgSlug} memberId={memberId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
