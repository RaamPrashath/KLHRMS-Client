import { redirect } from 'next/navigation';
import { requireOrgMembership } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { NotificationsPageShell } from '@/modules/notifications/components/NotificationsPageShell';

export default async function NotificationsPage({
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
    <div className="flex-1 flex flex-col min-h-full bg-background">
      <NotificationsPageShell orgSlug={orgSlug} memberId={memberId!} />
    </div>
  );
}
