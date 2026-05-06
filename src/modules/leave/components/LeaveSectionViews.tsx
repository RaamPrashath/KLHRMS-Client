'use client';

import { format, parseISO, startOfMonth } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useLeaveBalances } from '@/modules/leave/hooks/useLeaveBalances';
import { useLeaveRequests } from '@/modules/leave/hooks/useLeaveRequests';
import { useLeaveShell } from '@/modules/leave/components/LeaveSectionShell';
import { LeaveRequestsTable } from '@/modules/leave/components/LeaveRequestsTable';
import type { HolidayRecord, LeaveBalanceRecord, LeaveTypeRecord } from '@/modules/leave/types/leaveTypes';

function getInitials(name: string | null, email: string | null) {
  const source = name ?? email ?? 'HR';
  const parts = source.split(' ').filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'HR';
}

function formatRange(startDate: string, endDate: string) {
  return `${format(parseISO(startDate), 'MMM d')} → ${format(parseISO(endDate), 'MMM d')}`;
}

function statusTone(status: string) {
  if (status === 'APPROVED') return 'bg-[#00874A]/[0.08] text-primary';
  if (status === 'REJECTED') return 'bg-destructive-bg text-destructive-text';
  if (status === 'CANCELLED') return 'bg-neutral-100 text-neutral-500';
  return 'bg-warning-bg text-warning-text';
}

function SurfaceCard({
  children,
  className,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]',
        className,
      )}
    >
      {children}
    </section>
  );
}

function SectionEmpty({
  title,
  body,
}: Readonly<{
  title: string;
  body: string;
}>) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      <p className="max-w-md text-sm text-neutral-500">{body}</p>
    </div>
  );
}

export function LeaveRequestsView() {
  const { orgSlug, memberId, permissions, openRequestDetails } = useLeaveShell();
  const today = new Date();
  const requestsQuery = useLeaveRequests(orgSlug, memberId, {
    fromDate: format(startOfMonth(today), 'yyyy-MM-dd'),
    page: 1,
    pageSize: 100, // Fetch more for client-side filtering
    year: today.getFullYear(),
  });

  return (
    <SurfaceCard>
      <div className="border-b border-black/[0.04] px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-neutral-900">Leave Requests</p>
            <p className="mt-1 text-sm text-neutral-500">A calm, glanceable queue for upcoming time away and approval decisions.</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <LeaveRequestsTable
          requests={requestsQuery.data?.items || []}
          isLoading={requestsQuery.isLoading}
          onRowClick={openRequestDetails}
          viewScope={permissions.view}
        />
      </div>
    </SurfaceCard>
  );
}

export function LeaveBalancesView() {
  const { orgSlug, memberId, permissions } = useLeaveShell();
  const balancesQuery = useLeaveBalances(orgSlug, memberId, { year: new Date().getFullYear() });

  // Hide member column for "self" scope
  const showMemberColumn = permissions.view !== 'self';

  return (
    <SurfaceCard>
      <div className="border-b border-black/[0.04] px-6 py-5">
        <p className="text-sm font-medium text-neutral-900">Balance overview</p>
        <p className="mt-1 text-sm text-neutral-500">Remaining, used, and carried-forward days in a softer, easier-to-read format.</p>
      </div>

      {balancesQuery.isLoading ? (
        <SectionEmpty title="Loading balances..." body="Fetching the latest balance snapshots." />
      ) : balancesQuery.data?.items.length ? (
        <Table>
          <TableHeader className="border-b border-black/[0.04] bg-neutral-50/60">
            <TableRow className="border-b-0 hover:bg-transparent">
              {showMemberColumn && <TableHead className="px-6 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Member</TableHead>}
              <TableHead className="px-4 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Leave Type</TableHead>
              <TableHead className="px-4 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Allocated</TableHead>
              <TableHead className="px-4 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Used</TableHead>
              <TableHead className="px-4 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Carry</TableHead>
              <TableHead className="px-4 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Remaining</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balancesQuery.data.items.map((balance: LeaveBalanceRecord) => (
              <TableRow key={balance.id} className="border-black/[0.04] hover:bg-neutral-50/70">
                {showMemberColumn && (
                  <TableCell className="px-6 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900">{balance.member.name ?? balance.member.email ?? balance.member.memberId}</p>
                      <p className="truncate text-sm text-neutral-500">{balance.member.email ?? balance.member.memberId}</p>
                    </div>
                  </TableCell>
                )}
                <TableCell className="px-4 py-4 text-sm text-neutral-900">{balance.leaveType.name}</TableCell>
                <TableCell className="px-4 py-4 font-mono text-[13px] text-neutral-900">{balance.allocated}</TableCell>
                <TableCell className="px-4 py-4 font-mono text-[13px] text-neutral-900">{balance.used}</TableCell>
                <TableCell className="px-4 py-4 font-mono text-[13px] text-neutral-900">{balance.carriedForward}</TableCell>
                <TableCell className="px-4 py-4 font-mono text-[13px] text-primary">{balance.remaining}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <SectionEmpty title="No balances available" body="Balances will appear here once leave types and allocations are in place." />
      )}
    </SurfaceCard>
  );
}

export function LeaveTypesView() {
  const { canApprove, leaveTypes, leaveTypesLoading, openLeaveTypeDialog } = useLeaveShell();

  if (!canApprove) {
    return (
      <SurfaceCard>
        <SectionEmpty title="Restricted section" body="Only organization-level approvers can manage leave types." />
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard>
      <div className="flex items-center justify-between border-b border-black/[0.04] px-6 py-5">
        <div>
          <p className="text-sm font-medium text-neutral-900">Policy categories</p>
          <p className="mt-1 text-sm text-neutral-500">Annual, sick, unpaid, and any custom leave bucket your team needs.</p>
        </div>
        <Button
          className="rounded-full bg-primary px-4 text-white shadow-[0_10px_24px_rgba(0,135,74,0.18)] hover:bg-primary-hover"
          onClick={() => openLeaveTypeDialog()}
        >
          New Leave Type
        </Button>
      </div>

      {leaveTypesLoading ? (
        <SectionEmpty title="Loading leave types..." body="Preparing the policy list for this organization." />
      ) : leaveTypes.length ? (
        <Table>
          <TableHeader className="border-b border-black/[0.04] bg-neutral-50/60">
            <TableRow className="border-b-0 hover:bg-transparent">
              <TableHead className="px-6 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Name</TableHead>
              <TableHead className="px-4 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Quota</TableHead>
              <TableHead className="px-4 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Carry Forward</TableHead>
              <TableHead className="px-4 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Paid</TableHead>
              <TableHead className="px-6 text-right text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaveTypes.map((leaveType: LeaveTypeRecord) => (
              <TableRow key={leaveType.id} className="border-black/[0.04] hover:bg-neutral-50/70">
                <TableCell className="px-6 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">{leaveType.name}</p>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 font-mono text-[13px] text-neutral-900">{leaveType.quota}</TableCell>
                <TableCell className="px-4 py-4 text-sm text-neutral-900">{leaveType.carryForward ? 'Enabled' : 'Off'}</TableCell>
                <TableCell className="px-4 py-4 text-sm text-neutral-900">{leaveType.isPaid ? 'Yes' : 'No'}</TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <Button variant="ghost" className="rounded-full px-3 text-neutral-600 hover:bg-black/[0.03]" onClick={() => openLeaveTypeDialog(leaveType)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <SectionEmpty title="No leave types configured" body="Create your first leave type to start shaping the policy layer." />
      )}
    </SurfaceCard>
  );
}

export function LeaveHolidaysView() {
  const { canApprove, holidays, holidaysLoading, openHolidayDialog, deleteHoliday } = useLeaveShell();

  if (!canApprove) {
    return (
      <SurfaceCard>
        <SectionEmpty title="Restricted section" body="Only organization-level approvers can maintain the holiday list." />
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard>
      <div className="flex items-center justify-between border-b border-black/[0.04] px-6 py-5">
        <div>
          <p className="text-sm font-medium text-neutral-900">Holiday list</p>
          <p className="mt-1 text-sm text-neutral-500">These dates also glow inside the mini-calendar so the whole module stays in sync.</p>
        </div>
        <Button
          className="rounded-full bg-primary px-4 text-white shadow-[0_10px_24px_rgba(0,135,74,0.18)] hover:bg-primary-hover"
          onClick={() => openHolidayDialog()}
        >
          New Holiday
        </Button>
      </div>

      {holidaysLoading ? (
        <SectionEmpty title="Loading holidays..." body="Syncing the calendar highlights for this month." />
      ) : holidays.length ? (
        <Table>
          <TableHeader className="border-b border-black/[0.04] bg-neutral-50/60">
            <TableRow className="border-b-0 hover:bg-transparent">
              <TableHead className="px-6 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Holiday</TableHead>
              <TableHead className="px-4 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Date</TableHead>
              <TableHead className="px-4 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Recurring</TableHead>
              <TableHead className="px-4 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Description</TableHead>
              <TableHead className="px-6 text-right text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holidays.map((holiday: HolidayRecord) => (
              <TableRow key={holiday.id} className="border-black/[0.04] hover:bg-neutral-50/70">
                <TableCell className="px-6 py-4 text-sm font-medium text-neutral-900">{holiday.name}</TableCell>
                <TableCell className="px-4 py-4 font-mono text-[13px] text-neutral-900">{format(parseISO(holiday.holidayDate), 'yyyy-MM-dd')}</TableCell>
                <TableCell className="px-4 py-4 text-sm text-neutral-900">{holiday.isRecurring ? 'Yes' : 'No'}</TableCell>
                <TableCell className="px-4 py-4 text-sm text-neutral-500">{holiday.description || 'Company holiday'}</TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" className="rounded-full px-3 text-neutral-600 hover:bg-black/[0.03]" onClick={() => openHolidayDialog(holiday)}>
                      Edit
                    </Button>
                    <Button variant="ghost" className="rounded-full px-3 text-destructive-text hover:bg-destructive-bg" onClick={() => void deleteHoliday(holiday.id)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <SectionEmpty title="No holidays added" body="Add a holiday and it will immediately highlight in the calendar sidebar." />
      )}
    </SurfaceCard>
  );
}
