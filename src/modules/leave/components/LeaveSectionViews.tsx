'use client';

import React, { useState } from 'react';
import { format, parseISO, startOfMonth } from 'date-fns';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { ArrowUpDown, RefreshCw, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLeaveBalances } from '@/modules/leave/hooks/useLeaveBalances';
import { useLeaveRequests } from '@/modules/leave/hooks/useLeaveRequests';
import { useHolidaysTable } from '@/modules/leave/hooks/useHolidaysTable';
import { useLeaveShell } from '@/modules/leave/components/LeaveSectionShell';
import { EmployeePagination } from '@/modules/employees/components/EmployeePagination';
import type {
  HolidayRecord,
  LeaveBalanceRecord,
  LeaveRequestRecord,
  LeaveTypeRecord,
} from '@/modules/leave/types/leaveTypes';

// ─── Shared card shell ────────────────────────────────────────────────────────

function Card({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
      {children}
    </div>
  );
}

// Toolbar strip: [search][filters…][action buttons]
function Toolbar({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.04] bg-surface px-8 py-6">
      {children}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: Readonly<{ value: string; onChange: (v: string) => void; placeholder: string }>) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 pointer-events-none" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 bg-canvas border-0 focus:bg-surface focus:border focus:border-primary focus:ring-[3px] focus:ring-primary/10 text-sm"
      />
    </div>
  );
}

function SectionEmpty({ title }: Readonly<{ title: string; body?: string }>) {
  return (
    <div className="bg-surface py-16 text-center text-sm text-neutral-400">
      {title}
    </div>
  );
}

// ─── Leave Requests ───────────────────────────────────────────────────────────

type SortOption = 'pending-first' | 'latest' | 'oldest';
type FilterOption = 'all-time' | 'this-month' | 'this-week' | 'today';

function statusTone(status: string) {
  if (status === 'APPROVED') return 'bg-success-bg text-success-text border-success-border';
  if (status === 'REJECTED') return 'bg-destructive-bg text-destructive-text border-destructive-border';
  if (status === 'CANCELLED') return 'bg-neutral-100 text-neutral-500 border-neutral-200';
  return 'bg-warning-bg text-warning-text border-warning-border';
}

function statusLabel(status: string) {
  if (status === 'APPROVED') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'CANCELLED') return 'Cancelled';
  return 'Pending';
}

export function LeaveRequestsView() {
  const { orgSlug, memberId, permissions, openRequestDetails } = useLeaveShell();
  const today = new Date();
  const requestsQuery = useLeaveRequests(orgSlug, memberId, {
    fromDate: format(startOfMonth(today), 'yyyy-MM-dd'),
    page: 1,
    pageSize: 200,
    year: today.getFullYear(),
  });

  const showNameColumn = permissions.view !== 'self';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all-time');
  const [sort, setSort] = useState<SortOption>('latest');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const allRequests = requestsQuery.data?.items ?? [];

  const filtered = React.useMemo(() => {
    let items = allRequests;

    if (filter !== 'all-time') {
      const now = new Date();
      const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      let from: Date;
      let to: Date;
      if (filter === 'today') {
        from = startOf(now); to = startOf(now);
      } else if (filter === 'this-week') {
        const dow = now.getDay();
        from = startOf(new Date(now)); from.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
        to = new Date(from); to.setDate(from.getDate() + 6);
      } else {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
      items = items.filter((r) => {
        const s = parseISO(r.startDate);
        const e = parseISO(r.endDate);
        return s <= to && e >= from;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (r) =>
          (r.member.name ?? '').toLowerCase().includes(q) ||
          (r.member.email ?? '').toLowerCase().includes(q) ||
          r.leaveType.name.toLowerCase().includes(q) ||
          r.status.toLowerCase().includes(q),
      );
    }

    const sorted = [...items];
    if (sort === 'pending-first') {
      sorted.sort((a, b) => {
        if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
        if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [allRequests, filter, search, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const emptyBody = search || filter !== 'all-time'
    ? 'Try adjusting your filters.'
    : 'Leave requests will appear here once submitted.';

  return (
    <Card>
      <Toolbar>
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by name, email, or leave type…"
        />
        <Select value={filter} onValueChange={(v) => { setFilter(v as FilterOption); setPage(1); }}>
          <SelectTrigger className="h-9 w-[140px] text-sm border-0 bg-canvas">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-time">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="this-month">This Month</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => { setSort(v as SortOption); setPage(1); }}>
          <SelectTrigger className="h-9 w-[150px] text-sm border-0 bg-canvas">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending-first">Pending First</SelectItem>
            <SelectItem value="latest">Latest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </Toolbar>

      {requestsQuery.isLoading && (
        <div className="flex flex-col divide-y divide-black/4 bg-surface px-4">
          {['a','b','c','d','e'].map((k) => (
            <div key={`req-${k}`} className="border-b border-black/4 p-6">
              <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
            </div>
          ))}
        </div>
      )}
      {!requestsQuery.isLoading && paged.length === 0 && (
        <SectionEmpty title="No leave requests found" body={emptyBody} />
      )}
      {!requestsQuery.isLoading && paged.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/[0.04] bg-canvas/50">
                  {showNameColumn && <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Name</th>}
                  <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Leave Type</th>
                  <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">End Date</th>
                  <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Days</th>
                  <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/4 bg-surface">
                {paged.map((r: LeaveRequestRecord) => (
                  <tr
                    key={r.id}
                    onClick={() => openRequestDetails(r.id)}
                    className="cursor-pointer transition-colors hover:bg-black/[0.02]"
                  >
                    {showNameColumn && (
                      <td className="px-6 py-3">
                        <p className="font-medium text-neutral-900">{r.member.name ?? 'Unnamed'}</p>
                        <p className="text-xs text-neutral-500">{r.member.email}</p>
                      </td>
                    )}
                    <td className="px-6 py-3 text-neutral-700">{r.leaveType.name}</td>
                    <td className="px-6 py-3 text-neutral-700">{format(parseISO(r.startDate), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-3 text-neutral-700">{format(parseISO(r.endDate), 'MMM d, yyyy')}</td>
                    <td className="px-6 py-3 font-mono text-neutral-700">{r.days}</td>
                    <td className="px-6 py-3">
                      <Badge className={cn('rounded-full border px-3 py-0.5 text-xs font-medium', statusTone(r.status))}>
                        {statusLabel(r.status)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="border-t border-black/[0.04] px-8 py-6">
              <EmployeePagination
                page={page}
                totalPages={totalPages}
                total={filtered.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={() => undefined}
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ─── Leave Balances ───────────────────────────────────────────────────────────

export function LeaveBalancesView() {
  const { orgSlug, memberId, permissions } = useLeaveShell();
  const balancesQuery = useLeaveBalances(orgSlug, memberId, { year: new Date().getFullYear() });
  const showMemberColumn = permissions.view !== 'self';
  const [search, setSearch] = useState('');

  const items = balancesQuery.data?.items ?? [];
  const filtered = React.useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (b: LeaveBalanceRecord) =>
        (b.member.name ?? '').toLowerCase().includes(q) ||
        (b.member.email ?? '').toLowerCase().includes(q) ||
        b.leaveType.name.toLowerCase().includes(q),
    );
  }, [items, search]);

  const balEmptyBody = search ? 'Try adjusting your search.' : 'Balances will appear here once leave types and allocations are in place.';

  return (
    <Card>
      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by member or leave type…"
        />
      </Toolbar>

      {balancesQuery.isLoading && (
        <div className="flex flex-col divide-y divide-black/4 bg-surface px-4">
          {['a','b','c','d','e'].map((k) => (
            <div key={`bal-${k}`} className="border-b border-black/4 p-6">
              <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
            </div>
          ))}
        </div>
      )}
      {!balancesQuery.isLoading && filtered.length === 0 && (
        <SectionEmpty title="No balances found" body={balEmptyBody} />
      )}
      {!balancesQuery.isLoading && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/[0.04] bg-canvas/50">
                {showMemberColumn && <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Member</th>}
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Leave Type</th>
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Allocated</th>
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Used</th>
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Carry</th>
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Remaining</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/4 bg-surface">
              {filtered.map((b: LeaveBalanceRecord) => (
                <tr key={b.id} className="transition-colors hover:bg-black/[0.02]">
                  {showMemberColumn && (
                    <td className="px-6 py-3">
                      <p className="font-medium text-neutral-900">{b.member.name ?? b.member.email ?? b.member.memberId}</p>
                      <p className="text-xs text-neutral-500">{b.member.email}</p>
                    </td>
                  )}
                  <td className="px-6 py-3 text-neutral-700">{b.leaveType.name}</td>
                  <td className="px-6 py-3 font-mono text-neutral-900">{b.allocated}</td>
                  <td className="px-6 py-3 font-mono text-neutral-900">{b.used}</td>
                  <td className="px-6 py-3 font-mono text-neutral-900">{b.carriedForward}</td>
                  <td className="px-6 py-3 font-mono font-semibold text-primary">{b.remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Leave Types ──────────────────────────────────────────────────────────────

export function LeaveTypesView() {
  const { canApprove, leaveTypes, leaveTypesLoading, openLeaveTypeDialog } = useLeaveShell();
  const [search, setSearch] = useState('');

  if (!canApprove) {
    return (
      <Card>
        <SectionEmpty title="Restricted section" body="Only organization-level approvers can manage leave types." />
      </Card>
    );
  }

  const filtered = search.trim()
    ? leaveTypes.filter((t: LeaveTypeRecord) => t.name.toLowerCase().includes(search.toLowerCase()))
    : leaveTypes;

  const ltEmptyTitle = search ? 'No leave types match your search.' : 'No leave types configured';
  const ltEmptyBody = search ? 'Try a different search term.' : 'Create your first leave type to start shaping the policy layer.';

  return (
    <Card>
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search leave types…" />
        {/* spacer */}
        <div className="flex-1" />
        <Button
          className="h-8 rounded-full bg-primary px-4 text-sm text-white shadow-[0_10px_24px_rgba(0,135,74,0.18)] hover:bg-primary-hover"
          onClick={() => openLeaveTypeDialog()}
        >
          New Leave Type
        </Button>
      </Toolbar>

      {leaveTypesLoading && (
        <div className="flex flex-col divide-y divide-black/4 bg-surface px-4">
          {['a','b','c','d'].map((k) => (
            <div key={`lt-${k}`} className="border-b border-black/4 p-6">
              <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
            </div>
          ))}
        </div>
      )}
      {!leaveTypesLoading && filtered.length === 0 && (
        <SectionEmpty title={ltEmptyTitle} body={ltEmptyBody} />
      )}
      {!leaveTypesLoading && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/[0.04] bg-canvas/50">
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Quota</th>
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Carry Forward</th>
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-3 text-right text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/4 bg-surface">
              {filtered.map((t: LeaveTypeRecord) => (
                <tr key={t.id} className="transition-colors hover:bg-black/[0.02]">
                  <td className="px-6 py-3 font-medium text-neutral-900">{t.name}</td>
                  <td className="px-6 py-3 font-mono text-neutral-700">{t.quota}</td>
                  <td className="px-6 py-3 text-neutral-700">{t.carryForward ? 'Enabled' : 'Off'}</td>
                  <td className="px-6 py-3 text-neutral-700">{t.isPaid ? 'Yes' : 'No'}</td>
                  <td className="px-6 py-3 text-right">
                    <Button
                      variant="ghost"
                      className="h-7 rounded-full px-3 text-xs text-neutral-600 hover:bg-black/[0.03]"
                      onClick={() => openLeaveTypeDialog(t)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ─── Holidays ─────────────────────────────────────────────────────────────────

const MONTH_OPTIONS = [
  { value: '0', label: 'All months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function buildHolidayColumns(handlers: {
  canApprove: boolean;
  onEdit: (h: HolidayRecord) => void;
  onDelete: (id: string) => void;
}): ColumnDef<HolidayRecord>[] {
  const cols: ColumnDef<HolidayRecord>[] = [
    {
      id: 'name',
      header: 'Holiday',
      cell: ({ row }) => <span className="font-medium text-neutral-900">{row.original.name}</span>,
    },
    {
      id: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="font-mono text-[13px] text-neutral-700">
          {format(parseISO(row.original.holidayDate), 'dd MMM yyyy')}
        </span>
      ),
    },
    {
      id: 'isHoliday',
      header: 'Mandatory',
      cell: ({ row }) => (
        <span className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          row.original.isHoliday
            ? 'bg-success-bg text-success-text'
            : 'bg-neutral-100 text-neutral-500',
        )}>
          {row.original.isHoliday ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      id: 'recurring',
      header: 'Recurring',
      cell: ({ row }) => <span className="text-neutral-700">{row.original.isRecurring ? 'Yes' : 'No'}</span>,
    },
  ];

  if (handlers.canApprove) {
    cols.push({
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            className="h-7 rounded-full px-3 text-xs text-neutral-600 hover:bg-black/[0.03]"
            onClick={() => handlers.onEdit(row.original)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            className="h-7 rounded-full px-3 text-xs text-destructive-text hover:bg-destructive-bg"
            onClick={() => handlers.onDelete(row.original.id)}
          >
            Delete
          </Button>
        </div>
      ),
    });
  }

  return cols;
}

export function LeaveHolidaysView() {
  const { orgSlug, memberId, canApprove, canSync, openHolidayDialog, deleteHoliday, syncHolidays } = useLeaveShell();
  const {
    data,
    isLoading,
    isFetching,
    filters,
    totalPages,
    setPage,
    setPageSize,
    setSearch,
    setMonth,
  } = useHolidaysTable(orgSlug, memberId);

  const holidays = data?.items ?? [];
  const total = data?.total ?? 0;

  const columns = React.useMemo(
    () => buildHolidayColumns({ canApprove, onEdit: openHolidayDialog, onDelete: (id) => void deleteHoliday(id) }),
    [canApprove, openHolidayDialog, deleteHoliday],
  );

  const table = useReactTable({
    data: holidays,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const holEmptyBody = filters.search || filters.month > 0
    ? 'Try adjusting your search or filter.'
    : 'Add a holiday and it will immediately highlight in the calendar sidebar.';

  if (!canApprove) {
    return (
      <Card>
        <SectionEmpty title="Restricted section" body="Only organization-level approvers can maintain the holiday list." />
      </Card>
    );
  }

  return (
    <Card>
      <Toolbar>
        <SearchInput
          value={filters.search}
          onChange={(v) => setSearch(v)}
          placeholder="Search holidays…"
        />
        <Select value={String(filters.month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="h-9 w-[150px] text-sm border-0 bg-canvas">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* spacer */}
        <div className="flex-1" />
        {canSync && (
          <Button
            variant="outline"
            className="h-8 rounded-full px-4 text-sm text-neutral-700"
            onClick={() => void syncHolidays()}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Sync Public Holidays
          </Button>
        )}
        <Button
          className="h-8 rounded-full bg-primary px-4 text-sm text-white shadow-[0_10px_24px_rgba(0,135,74,0.18)] hover:bg-primary-hover"
          onClick={() => openHolidayDialog()}
        >
          New Holiday
        </Button>
      </Toolbar>

      <div className={cn('transition-opacity', isFetching && !isLoading ? 'opacity-60' : 'opacity-100')}>
        {isLoading && (
          <div className="flex flex-col divide-y divide-black/4 bg-surface px-4">
            {['a','b','c','d','e'].map((k) => (
              <div key={`hol-${k}`} className="border-b border-black/4 p-6">
                <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
              </div>
            ))}
          </div>
        )}
        {!isLoading && holidays.length === 0 && (
          <SectionEmpty title="No holidays found" body={holEmptyBody} />
        )}
        {!isLoading && holidays.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                  <tr className="border-b border-black/[0.04] bg-canvas/50">
                    {table.getHeaderGroups().map((hg) =>
                      hg.headers.map((h) => (
                        <th key={h.id} className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">
                          {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                        </th>
                      )),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/4 bg-surface">
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-black/[0.02]">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="border-t border-black/[0.04] px-8 py-6">
          <EmployeePagination
            page={filters.page}
            totalPages={totalPages}
            total={total}
            pageSize={filters.pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </Card>
  );
}
