import { redirect } from 'next/navigation';
import { requireOrgMembership } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { AttendanceReportPageShell } from '@/modules/attendance-report/components/AttendanceReportPageShell';

export default async function AttendanceReportPage({
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

  return <AttendanceReportPageShell orgSlug={orgSlug} memberId={memberId!} />;
}
