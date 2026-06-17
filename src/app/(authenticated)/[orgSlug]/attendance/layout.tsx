import { redirect } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import Link from 'next/link';
import { requireOrgMembership } from '@/lib/organizations';
import { requireServerSession } from '@/lib/server-session';
import { AttendancePermissionGate } from '@/modules/attendance/components/AttendancePermissionGate';
import { AttendanceRouteProvider } from '@/modules/attendance/components/AttendanceRouteContext';
import { ClockWidget } from '@/modules/attendance/components/ClockWidget';
import {
  isOperativeScope,
  resolveAttendancePermissions,
} from '@/modules/attendance/utils/attendancePermissions';

export default async function AttendanceLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}>) {
  const session = await requireServerSession();
  const { orgSlug } = await params;

  let memberId: string;
  let permissions = resolveAttendancePermissions({});
  try {
    const { member } = await requireOrgMembership(session.user.id, orgSlug);
    memberId = member.id;
    permissions = resolveAttendancePermissions(
      (member.role?.permissions as Record<string, Record<string, string>>) ?? {},
    );
  } catch {
    redirect('/organizations');
  }

  return (
    <AttendanceRouteProvider value={{ orgSlug, memberId: memberId!, permissions }}>
      <main className="min-h-full bg-canvas">
        <div className="flex min-h-full flex-1 flex-col gap-6">
          <div className="ml-7 mr-7 mt-7 flex items-start justify-end md:justify-between">
            <h1 className="hidden text-4xl font-semibold tracking-tight text-neutral-900 md:block">
              Who&apos;s in today?
            </h1>

            {isOperativeScope(permissions.create) && (
              <Link
                href={`/${orgSlug}/timesheet`}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-primary px-4 text-sm font-medium text-primary transition-colors duration-100 hover:bg-primary-ghost"
              >
                <CalendarDays className="size-4" strokeWidth={1.5} />
                Bulk attendance
              </Link>
            )}
          </div>

          <AttendancePermissionGate scope={permissions.create}>
            <div className="mx-7">
              <ClockWidget orgSlug={orgSlug} memberId={memberId!} />
            </div>
          </AttendancePermissionGate>

          {children}
        </div>
      </main>
    </AttendanceRouteProvider>
  );
}
