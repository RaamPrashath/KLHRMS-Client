'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { fetchLeavePageContextAction } from '@/modules/leave/api/leaveServerActions';
import { ApplyLeaveSheet } from '@/modules/leave/components/ApplyLeaveSheet';
import { HolidayDialog } from '@/modules/leave/components/HolidayDialog';
import { LeaveRequestDetailsDialog } from '@/modules/leave/components/LeaveRequestDetailsDialog';
import { LeaveTypeDialog } from '@/modules/leave/components/LeaveTypeDialog';
import { useDeleteHoliday } from '@/modules/leave/hooks/useDeleteHoliday';
import { useHolidays } from '@/modules/leave/hooks/useHolidays';
import { useLeaveBalances } from '@/modules/leave/hooks/useLeaveBalances';
import { useLeaveCalendar } from '@/modules/leave/hooks/useLeaveCalendar';
import { useLeaveRequests } from '@/modules/leave/hooks/useLeaveRequests';
import { useLeaveTypes } from '@/modules/leave/hooks/useLeaveTypes';
import { getLeaveErrorMessage } from '@/modules/leave/utils/errorMessage';
import { canApproveLeaves, canCreateLeaves, canViewLeaves, resolveLeavePermissions } from '@/modules/leave/utils/leavePermissions';
import type {
  HolidayRecord,
  LeaveBalanceFiltersState,
  LeaveCalendarFiltersState,
  LeaveRequestFiltersState,
  LeaveRequestRecord,
  LeaveTypeRecord,
} from '@/modules/leave/types/leaveTypes';

interface LeavePageShellProps {
  orgSlug: string;
  memberId: string;
}

function statusTone(status: string) {
  if (status === 'APPROVED') return 'bg-success-bg text-success-text';
  if (status === 'REJECTED') return 'bg-destructive-bg text-destructive-text';
  if (status === 'CANCELLED') return 'bg-neutral-50 text-neutral-500';
  return 'bg-warning-bg text-warning-text';
}

function startOfToday() {
  return new Date().toISOString().slice(0, 10);
}

function buildDefaultRequestFilters(): LeaveRequestFiltersState {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return {
    status: undefined,
    memberId: undefined,
    leaveTypeId: undefined,
    fromDate: `${year}-${month}-01`,
    toDate: undefined,
    year,
    page: 1,
    pageSize: 20,
  };
}

function buildCalendarDays(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const leading = first.getDay();
  const total = last.getDate();
  const cells: Array<{ date: string | null }> = [];
  for (let index = 0; index < leading; index += 1) cells.push({ date: null });
  for (let day = 1; day <= total; day += 1) {
    const date = new Date(year, month - 1, day).toISOString().slice(0, 10);
    cells.push({ date });
  }
  return cells;
}

export function LeavePageShell({ orgSlug, memberId }: Readonly<LeavePageShellProps>) {
  const [requestFilters, setRequestFilters] = useState<LeaveRequestFiltersState>(buildDefaultRequestFilters);
  const [balanceFilters, setBalanceFilters] = useState<LeaveBalanceFiltersState>({ year: new Date().getFullYear() });
  const [calendarFilters, setCalendarFilters] = useState<LeaveCalendarFiltersState>({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [applyOpen, setApplyOpen] = useState(false);
  const [leaveTypeDialogOpen, setLeaveTypeDialogOpen] = useState(false);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [selectedLeaveType, setSelectedLeaveType] = useState<LeaveTypeRecord | null>(null);
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayRecord | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const contextQuery = useQuery({
    queryKey: ['leave-context', orgSlug, memberId],
    queryFn: () => fetchLeavePageContextAction({ orgSlug, memberId }),
    staleTime: 60_000,
  });

  const permissions = resolveLeavePermissions(contextQuery.data?.permissions ?? {});
  const canView = canViewLeaves(permissions.view);
  const canCreate = canCreateLeaves(permissions.create);
  const canApprove = canApproveLeaves(permissions.approve);
  const members = contextQuery.data?.members ?? [];

  const leaveTypesQuery = useLeaveTypes(orgSlug, memberId);
  const requestsQuery = useLeaveRequests(orgSlug, memberId, requestFilters);
  const balancesQuery = useLeaveBalances(orgSlug, memberId, balanceFilters);
  const holidaysQuery = useHolidays(orgSlug, memberId, {
    year: calendarFilters.year,
    month: canApprove ? undefined : calendarFilters.month,
  });
  const calendarQuery = useLeaveCalendar(orgSlug, memberId, calendarFilters.year, calendarFilters.month);
  const deleteHolidayMutation = useDeleteHoliday(orgSlug, memberId);

  const leaveTypes = leaveTypesQuery.data ?? [];
  const requestItems = requestsQuery.data?.items ?? [];
  const balanceItems = balancesQuery.data?.items ?? [];
  const holidayItems = holidaysQuery.data ?? [];

  const calendarCells = useMemo(
    () => buildCalendarDays(calendarFilters.year, calendarFilters.month),
    [calendarFilters.year, calendarFilters.month],
  );

  const holidayMap = useMemo(() => {
    const map = new Map<string, HolidayRecord[]>();
    for (const holiday of calendarQuery.data?.holidays ?? []) {
      const bucket = map.get(holiday.holidayDate) ?? [];
      bucket.push(holiday);
      map.set(holiday.holidayDate, bucket);
    }
    return map;
  }, [calendarQuery.data?.holidays]);

  const requestMap = useMemo(() => {
    const map = new Map<string, LeaveRequestRecord[]>();
    for (const request of calendarQuery.data?.leaveRequests ?? []) {
      const current = new Date(`${request.startDate}T00:00:00`);
      const end = new Date(`${request.endDate}T00:00:00`);
      while (current <= end) {
        const key = current.toISOString().slice(0, 10);
        const bucket = map.get(key) ?? [];
        bucket.push(request);
        map.set(key, bucket);
        current.setDate(current.getDate() + 1);
      }
    }
    return map;
  }, [calendarQuery.data?.leaveRequests]);

  if (contextQuery.isLoading) {
    return <div className="flex items-center justify-center py-20 text-sm text-neutral-500">Loading leave module...</div>;
  }

  if (!canView) {
    return <div className="flex items-center justify-center py-20 text-sm text-neutral-500">You don&apos;t have permission to use this page.</div>;
  }

  async function handleDeleteHoliday(holidayId: string) {
    try {
      await deleteHolidayMutation.mutateAsync(holidayId);
      toast.success('Holiday deleted');
    } catch (error) {
      toast.error(getLeaveErrorMessage(error, 'Failed to delete holiday'));
    }
  }

  return (
    <>
      <main className="min-h-full bg-canvas">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
          <section className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">Leave Management</h1>
              <p className="mt-1 text-sm text-neutral-500">Requests, balances, holidays, and policy controls in one place.</p>
            </div>
            {canCreate ? (
              <Button className="bg-primary text-white hover:bg-primary-hover" onClick={() => setApplyOpen(true)}>
                Apply Leave
              </Button>
            ) : null}
          </section>

          <Tabs defaultValue="requests" className="flex flex-col gap-6">
            <TabsList className="w-full justify-start overflow-x-auto rounded-xl border border-neutral-100 bg-surface p-1">
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="balances">Balances</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              {canApprove ? <TabsTrigger value="types">Leave Types</TabsTrigger> : null}
              {canApprove ? <TabsTrigger value="holidays">Holidays</TabsTrigger> : null}
            </TabsList>

            <TabsContent value="requests" className="mt-0">
              <section className="rounded-xl border border-neutral-100 bg-surface p-4 shadow-[var(--shadow-1)]">
                <div className="mb-4 grid gap-3 md:grid-cols-5">
                  <Select
                    value={requestFilters.status ?? 'all'}
                    onValueChange={(value) =>
                      setRequestFilters((current) => ({
                        ...current,
                        status: value === 'all' ? undefined : (value as LeaveRequestFiltersState['status']),
                        page: 1,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={requestFilters.leaveTypeId ?? 'all'}
                    onValueChange={(value) =>
                      setRequestFilters((current) => ({
                        ...current,
                        leaveTypeId: value === 'all' ? undefined : value,
                        page: 1,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All leave types</SelectItem>
                      {leaveTypes.map((leaveType) => (
                        <SelectItem key={leaveType.id} value={leaveType.id}>
                          {leaveType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {permissions.view === 'organization' ? (
                    <Select
                      value={requestFilters.memberId ?? 'all'}
                      onValueChange={(value) =>
                        setRequestFilters((current) => ({
                          ...current,
                          memberId: value === 'all' ? undefined : value,
                          page: 1,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Member" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All members</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member.memberId} value={member.memberId}>
                            {member.name ?? member.email ?? member.memberId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}

                  <Input
                    type="date"
                    value={requestFilters.fromDate ?? ''}
                    onChange={(event) =>
                      setRequestFilters((current) => ({ ...current, fromDate: event.target.value || undefined, page: 1 }))
                    }
                  />
                  <Input
                    type="date"
                    value={requestFilters.toDate ?? ''}
                    onChange={(event) =>
                      setRequestFilters((current) => ({ ...current, toDate: event.target.value || undefined, page: 1 }))
                    }
                  />
                </div>

                <div className="overflow-x-auto rounded-lg border border-neutral-100">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Requester</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Date Range</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requestsQuery.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-sm text-neutral-500">Loading requests...</TableCell>
                        </TableRow>
                      ) : requestItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-sm text-neutral-500">No leave requests found.</TableCell>
                        </TableRow>
                      ) : (
                        requestItems.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-neutral-900">{request.member.name ?? 'Unnamed member'}</span>
                                <span className="text-xs text-neutral-500">{request.member.email ?? request.member.memberId}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-neutral-900">{request.leaveType.name}</TableCell>
                            <TableCell className="text-sm text-neutral-900">{request.startDate} to {request.endDate}</TableCell>
                            <TableCell className="font-mono text-sm text-neutral-900">{request.days}</TableCell>
                            <TableCell><Badge className={statusTone(request.status)}>{request.status}</Badge></TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => setSelectedRequestId(request.id)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="balances" className="mt-0">
              <section className="rounded-xl border border-neutral-100 bg-surface p-4 shadow-[var(--shadow-1)]">
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <Input
                    type="number"
                    min="2000"
                    max="3000"
                    value={balanceFilters.year ?? ''}
                    onChange={(event) =>
                      setBalanceFilters((current) => ({ ...current, year: event.target.value ? Number(event.target.value) : undefined }))
                    }
                  />
                  {permissions.view === 'organization' ? (
                    <Select
                      value={balanceFilters.memberId ?? 'all'}
                      onValueChange={(value) =>
                        setBalanceFilters((current) => ({ ...current, memberId: value === 'all' ? undefined : value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Member" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All members</SelectItem>
                        {members.map((member) => (
                          <SelectItem key={member.memberId} value={member.memberId}>
                            {member.name ?? member.email ?? member.memberId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Select
                    value={balanceFilters.leaveTypeId ?? 'all'}
                    onValueChange={(value) =>
                      setBalanceFilters((current) => ({ ...current, leaveTypeId: value === 'all' ? undefined : value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All leave types</SelectItem>
                      {leaveTypes.map((leaveType) => (
                        <SelectItem key={leaveType.id} value={leaveType.id}>
                          {leaveType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto rounded-lg border border-neutral-100">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Leave Type</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Allocated</TableHead>
                        <TableHead>Carry</TableHead>
                        <TableHead>Used</TableHead>
                        <TableHead>Lapsed</TableHead>
                        <TableHead>Remaining</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balancesQuery.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center text-sm text-neutral-500">Loading balances...</TableCell>
                        </TableRow>
                      ) : balanceItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-24 text-center text-sm text-neutral-500">No balances found.</TableCell>
                        </TableRow>
                      ) : (
                        balanceItems.map((balance) => (
                          <TableRow key={balance.id}>
                            <TableCell className="text-sm text-neutral-900">{balance.member.name ?? balance.member.email ?? balance.member.memberId}</TableCell>
                            <TableCell className="text-sm text-neutral-900">{balance.leaveType.name}</TableCell>
                            <TableCell className="font-mono text-sm text-neutral-900">{balance.year}</TableCell>
                            <TableCell className="font-mono text-sm text-neutral-900">{balance.allocated}</TableCell>
                            <TableCell className="font-mono text-sm text-neutral-900">{balance.carriedForward}</TableCell>
                            <TableCell className="font-mono text-sm text-neutral-900">{balance.used}</TableCell>
                            <TableCell className="font-mono text-sm text-neutral-900">{balance.lapsed}</TableCell>
                            <TableCell className="font-mono text-sm text-neutral-900">{balance.remaining}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="calendar" className="mt-0">
              <section className="rounded-xl border border-neutral-100 bg-surface p-4 shadow-[var(--shadow-1)]">
                <div className="mb-4 grid gap-3 md:grid-cols-2">
                  <Input
                    type="number"
                    min="2000"
                    max="3000"
                    value={calendarFilters.year}
                    onChange={(event) =>
                      setCalendarFilters((current) => ({ ...current, year: Number(event.target.value || new Date().getFullYear()) }))
                    }
                  />
                  <Select
                    value={String(calendarFilters.month)}
                    onValueChange={(value) =>
                      setCalendarFilters((current) => ({ ...current, month: Number(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                        <SelectItem key={month} value={String(month)}>
                          {new Date(2026, month - 1, 1).toLocaleString('en-US', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
                    <div key={label} className="rounded-md bg-canvas px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {label}
                    </div>
                  ))}
                  {calendarCells.map((cell, index) => {
                    if (!cell.date) {
                      return <div key={`empty-${index}`} className="min-h-32 rounded-md border border-dashed border-neutral-100 bg-canvas/40" />;
                    }

                    const dayHolidays = holidayMap.get(cell.date) ?? [];
                    const dayRequests = requestMap.get(cell.date) ?? [];

                    return (
                      <div key={cell.date} className="min-h-32 rounded-md border border-neutral-100 bg-canvas p-2">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="font-mono text-xs text-neutral-500">{cell.date.slice(-2)}</span>
                          {cell.date === startOfToday() ? <span className="text-[11px] text-primary">Today</span> : null}
                        </div>
                        <div className="flex flex-col gap-1">
                          {dayHolidays.slice(0, 2).map((holiday) => (
                            <div key={holiday.id} className="rounded-full bg-info-bg px-2 py-1 text-[11px] text-info-text">
                              {holiday.name}
                            </div>
                          ))}
                          {dayRequests.slice(0, 3).map((request) => (
                            <button
                              key={`${request.id}-${cell.date}`}
                              type="button"
                              className="truncate rounded-full bg-surface px-2 py-1 text-left text-[11px] text-neutral-700 shadow-[var(--shadow-1)]"
                              onClick={() => setSelectedRequestId(request.id)}
                            >
                              {request.member.name ?? 'Member'} · {request.leaveType.name}
                            </button>
                          ))}
                          {dayRequests.length > 3 ? (
                            <span className="text-[11px] text-neutral-500">+{dayRequests.length - 3} more</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </TabsContent>

            {canApprove ? (
              <TabsContent value="types" className="mt-0">
                <section className="rounded-xl border border-neutral-100 bg-surface p-4 shadow-[var(--shadow-1)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-900">Leave Types</h2>
                      <p className="text-sm text-neutral-500">Create and tune leave categories for this organization.</p>
                    </div>
                    <Button
                      className="bg-primary text-white hover:bg-primary-hover"
                      onClick={() => {
                        setSelectedLeaveType(null);
                        setLeaveTypeDialogOpen(true);
                      }}
                    >
                      New Leave Type
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-neutral-100">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Quota</TableHead>
                          <TableHead>Carry Forward</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leaveTypesQuery.isLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-sm text-neutral-500">Loading leave types...</TableCell>
                          </TableRow>
                        ) : leaveTypes.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-sm text-neutral-500">No leave types configured.</TableCell>
                          </TableRow>
                        ) : (
                          leaveTypes.map((leaveType) => (
                            <TableRow key={leaveType.id}>
                              <TableCell className="text-sm text-neutral-900">{leaveType.name}</TableCell>
                              <TableCell className="font-mono text-sm text-neutral-900">{leaveType.quota}</TableCell>
                              <TableCell className="text-sm text-neutral-900">{leaveType.carryForward ? 'Yes' : 'No'}</TableCell>
                              <TableCell className="text-sm text-neutral-900">{leaveType.isPaid ? 'Paid' : 'Unpaid'}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedLeaveType(leaveType);
                                    setLeaveTypeDialogOpen(true);
                                  }}
                                >
                                  Edit
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              </TabsContent>
            ) : null}

            {canApprove ? (
              <TabsContent value="holidays" className="mt-0">
                <section className="rounded-xl border border-neutral-100 bg-surface p-4 shadow-[var(--shadow-1)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-900">Holidays</h2>
                      <p className="text-sm text-neutral-500">Maintain your public holiday list for planning and leave calendars.</p>
                    </div>
                    <Button
                      className="bg-primary text-white hover:bg-primary-hover"
                      onClick={() => {
                        setSelectedHoliday(null);
                        setHolidayDialogOpen(true);
                      }}
                    >
                      New Holiday
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-neutral-100">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Recurring</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {holidayItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center text-sm text-neutral-500">No holidays found.</TableCell>
                          </TableRow>
                        ) : (
                          holidayItems.map((holiday) => (
                            <TableRow key={holiday.id}>
                              <TableCell className="text-sm text-neutral-900">{holiday.name}</TableCell>
                              <TableCell className="font-mono text-sm text-neutral-900">{holiday.holidayDate}</TableCell>
                              <TableCell className="text-sm text-neutral-900">{holiday.isRecurring ? 'Yes' : 'No'}</TableCell>
                              <TableCell className="text-sm text-neutral-500">{holiday.description || '—'}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedHoliday(holiday);
                                      setHolidayDialogOpen(true);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteHoliday(holiday.id)}>
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </section>
              </TabsContent>
            ) : null}
          </Tabs>
        </div>
      </main>

      <ApplyLeaveSheet
        open={applyOpen}
        onOpenChange={setApplyOpen}
        orgSlug={orgSlug}
        memberId={memberId}
        createScope={permissions.create}
        leaveTypes={leaveTypes}
        members={members}
      />

      <LeaveTypeDialog
        open={leaveTypeDialogOpen}
        onOpenChange={setLeaveTypeDialogOpen}
        orgSlug={orgSlug}
        memberId={memberId}
        leaveType={selectedLeaveType}
      />

      <HolidayDialog
        open={holidayDialogOpen}
        onOpenChange={setHolidayDialogOpen}
        orgSlug={orgSlug}
        memberId={memberId}
        holiday={selectedHoliday}
      />

      <LeaveRequestDetailsDialog
        open={selectedRequestId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedRequestId(null);
        }}
        orgSlug={orgSlug}
        memberId={memberId}
        leaveRequestId={selectedRequestId}
        permissions={permissions}
      />
    </>
  );
}
