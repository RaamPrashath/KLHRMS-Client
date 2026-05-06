import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { requireOrgMembership } from '@/lib/organizations';
import { BulkAttendancePageClient } from './_components/BulkAttendancePageClient';

export default async function BulkAttendancePage({
  params,
}: Readonly<{
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) redirect('/login');

  const { orgSlug } = await params;
  let memberId: string;

  try {
    const { member } = await requireOrgMembership(session.user.id, orgSlug);
    memberId = member.id;
  } catch {
    redirect('/organizations');
  }

  return (
    <main className="min-h-full bg-canvas">
      <div className="px-6 py-6 flex flex-col gap-6 max-w-7xl">
        {/* Page heading */}
        <section aria-labelledby="bulk-attendance-heading">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                id="bulk-attendance-heading"
                className="text-2xl font-semibold text-neutral-900 tracking-tight"
              >
                Bulk Attendance
              </h1>
              <p className="text-sm text-neutral-500 mt-1">
                Log your work hours for the week using the time-grid planner.
              </p>
            </div>
          </div>
        </section>

        {/* Calendar client */}
        <BulkAttendancePageClient orgSlug={orgSlug} memberId={memberId!} />
      </div>
    </main>
  );
}
