import { redirect } from 'next/navigation';
import { requireOrgMembership } from '@/lib/organizations';
import { BulkAttendancePageClient } from './_components/BulkAttendancePageClient';
import { requireServerSession } from '@/lib/server-session';

export default async function BulkAttendancePage({
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
    <BulkAttendancePageClient orgSlug={orgSlug} memberId={memberId!} />
  );
}
