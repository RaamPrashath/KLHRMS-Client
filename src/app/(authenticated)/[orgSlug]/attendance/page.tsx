import { redirect } from 'next/navigation';
import { requireOrgMembership } from '@/lib/organizations';
import { AttendancePageShell } from '@/modules/attendance/components/AttendancePageShell';
import { requireServerSession } from '@/lib/server-session';

export default async function AttendancePage({
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
      <AttendancePageShell orgSlug={orgSlug} memberId={memberId!} />
    </div>
  );
}
