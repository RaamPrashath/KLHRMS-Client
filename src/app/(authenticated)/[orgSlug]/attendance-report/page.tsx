import { Suspense } from 'react';
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

  return (
    <Suspense
      fallback={
        <main className="min-h-full bg-canvas p-7">
          <div className="h-96 animate-pulse rounded-xl bg-neutral-100" />
        </main>
      }
    >
      <AttendanceReportPageShell orgSlug={orgSlug} memberId={memberId!} />
    </Suspense>
  );
}
