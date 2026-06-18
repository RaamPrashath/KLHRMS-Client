'use client';

import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { format, parseISO, startOfMonth } from 'date-fns';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Info, RefreshCw, Search, X } from 'lucide-react';
import { IoFilterSharp } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FloatingPanelBody,
  FloatingPanelContent,
  FloatingPanelRoot,
  FloatingPanelTrigger,
  useFloatingPanel,
} from '@/components/ui/floating-panel';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { LeaveBalanceAssignmentSheet } from '@/modules/leave/components/LeaveBalanceAssignmentSheet';
import { useLeaveRequests } from '@/modules/leave/hooks/useLeaveRequests';
import { useLeaveHistory } from '@/modules/leave/hooks/useLeaveHistory';
import { useLeaveSummary } from '@/modules/leave/hooks/useLeaveSummary';
import { useLeaveShell } from '@/modules/leave/components/LeaveSectionShell';
import { EmployeePagination } from '@/modules/employees/components/EmployeePagination';
import {
  fetchLeaveBalancesAction,
  fetchHolidaysAction,
} from '@/modules/leave/api/leaveServerActions';
import { dateOnlyMonth, dateOnlyYear } from '@/modules/leave/utils/dateOnly';
import type {
  EmployeeLeaveSummary,
  HolidayRecord,
  LeaveBalanceRecord,
  LeaveRequestRecord,
  LeaveSummaryRequestItem,
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
const EMPTY_REQUESTS: LeaveRequestRecord[] = [];
const EMPTY_BALANCES: LeaveBalanceRecord[] = [];
const EMPTY_HOLIDAYS: HolidayRecord[] = [];
const EMPTY_SUMMARY_ITEMS: EmployeeLeaveSummary[] = [];

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
  const requestFilters = React.useMemo(() => {
    const today = new Date();
    return {
      status: 'PENDING' as const,
      fromDate: format(startOfMonth(today), 'yyyy-MM-dd'),
      page: 1,
      pageSize: 200,
      year: today.getFullYear(),
    };
  }, []);
  const requestsQuery = useLeaveRequests(orgSlug, memberId, requestFilters, {
    keepPreviousData: true,
    staleTime: 30_000,
  });

  const showNameColumn = permissions.view !== 'self';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all-time');
  const [sort, setSort] = useState<SortOption>('latest');
  const [page, setPage] = useState(1);

  const allRequests = requestsQuery.data?.items ?? EMPTY_REQUESTS;

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

  const REQ_PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / REQ_PAGE_SIZE));
  const paged = filtered.slice((page - 1) * REQ_PAGE_SIZE, page * REQ_PAGE_SIZE);
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
            <div key={`req-${k}`} className="border-b border-black/4 px-6 py-3">
              <div className="h-5 w-full animate-pulse rounded-md bg-neutral-100" />
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
          {filtered.length > 0 && (
            <div className="border-t border-black/[0.04] px-8 py-6">
              <EmployeePagination
                page={page}
                totalPages={totalPages}
                total={filtered.length}
                pageSize={REQ_PAGE_SIZE}
                onPageChange={setPage}
                onPageSizeChange={() => {}}
              />
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ─── Leave Balances ───────────────────────────────────────────────────────────

interface EmployeeBalanceGroup {
  memberId: string;
  name: string;
  email: string | null;
  items: LeaveBalanceRecord[];
  totalAllocated: number;
  totalUsed: number;
  totalRemaining: number;
}

function EmployeeBalanceDialog({
  open,
  onOpenChange,
  employeeName,
  balances,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  balances: LeaveBalanceRecord[];
  onEdit: (balance: LeaveBalanceRecord) => void;
}) {
  const totalAllocated = balances.reduce((s, b) => s + b.allocated, 0);
  const totalUsed = balances.reduce((s, b) => s + b.used, 0);
  const totalRemaining = balances.reduce((s, b) => s + b.remaining, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-neutral-900">{employeeName} — Leave Balances</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Leave Type</th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Allocated</th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Used</th>
                <th className="px-4 py-2 text-right text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Remaining</th>
                <th className="px-4 py-2 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {balances.map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-black/[0.02]">
                  <td className="px-4 py-2.5 text-neutral-900 font-medium">{b.leaveType.name}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-neutral-900 tabular-nums">{b.allocated}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-neutral-900 tabular-nums">{b.used}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-primary tabular-nums">{b.remaining}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      className="h-7 rounded-full px-2.5 text-xs text-neutral-500 hover:bg-black/[0.03]"
                      onClick={() => { onEdit(b); onOpenChange(false); }}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-neutral-100 mt-2 pt-4 flex justify-end gap-8 bg-neutral-50 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
          <div className="text-right">
            <span className="text-[11px] text-neutral-500">Allocated</span>
            <p className="font-mono font-semibold text-neutral-900 tabular-nums">{totalAllocated}</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-neutral-500">Used</span>
            <p className="font-mono font-semibold text-neutral-900 tabular-nums">{totalUsed}</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-neutral-500">Remaining</span>
            <p className="font-mono font-semibold text-primary tabular-nums">{totalRemaining}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LeaveBalancesView() {
  const { orgSlug, memberId, canApprove, members, leaveTypes } = useLeaveShell();
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<LeaveBalanceRecord | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMemberId, setDetailMemberId] = useState<string | null>(null);
  const PAGE_SIZE = 10;

  const query = useQuery({
    queryKey: ['leave-balances', orgSlug],
    queryFn: () => fetchLeaveBalancesAction({ orgSlug, memberId, filters: { year: new Date().getFullYear(), page: 1, pageSize: 500 } }),
    enabled: !!orgSlug && !!memberId,
    placeholderData: (prev) => prev,
  });

  const allItems = query.data?.items ?? EMPTY_BALANCES;

  const grouped: EmployeeBalanceGroup[] = React.useMemo(() => {
    const map = new Map<string, EmployeeBalanceGroup>();
    for (const b of allItems) {
      const id = b.member.memberId;
      let group = map.get(id);
      if (!group) {
        group = {
          memberId: id,
          name: b.member.name ?? b.member.email ?? id,
          email: b.member.email,
          items: [],
          totalAllocated: 0,
          totalUsed: 0,
          totalRemaining: 0,
        };
        map.set(id, group);
      }
      group.items.push(b);
      group.totalAllocated += b.allocated;
      group.totalUsed += b.used;
      group.totalRemaining += b.remaining;
    }
    return Array.from(map.values());
  }, [allItems]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    return grouped.filter((g) => g.name.toLowerCase().includes(q) || (g.email ?? '').toLowerCase().includes(q));
  }, [grouped, search]);

  const detailEmployee = React.useMemo(
    () => grouped.find((g) => g.memberId === detailMemberId) ?? null,
    [grouped, detailMemberId],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const balEmptyBody = search
    ? 'Try adjusting your search or filter.'
    : 'Balances will appear here once leave types and allocations are in place.';

  return (
    <Card>
      <Toolbar>
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by employee name or email…"
        />
        <div className="flex-1" />
        {canApprove ? (
          <Button
            className="h-9 rounded-lg bg-gradient-to-br from-[#3862f6] to-[#6366f1] px-4 text-sm font-bold text-white shadow-[0_4px_12px_rgba(56,98,246,0.15)]"
            onClick={() => {
              setSelectedBalance(null);
              setAssignOpen(true);
            }}
          >
            Assign Balance
          </Button>
        ) : null}
      </Toolbar>

      <div className={cn('transition-opacity', query.isFetching && !query.isLoading ? 'opacity-60' : 'opacity-100')}>
        {query.isLoading && (
          <div className="flex flex-col divide-y divide-black/4 bg-surface px-4">
            {['a','b','c','d','e'].map((k) => (
              <div key={`bal-${k}`} className="border-b border-black/4 p-6">
                <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
              </div>
            ))}
          </div>
        )}
        {!query.isLoading && filtered.length === 0 && (
          <SectionEmpty title="No balances found" body={balEmptyBody} />
        )}
        {!query.isLoading && filtered.length > 0 && (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm border-collapse" style={{ minWidth: 600 }}>
              <thead>
                <tr className="border-b border-black/[0.04] bg-canvas/50">
                  <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider w-[240px] max-w-[240px] sticky left-0 bg-[#f5f5f7] z-10">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Allocated</th>
                  <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Used</th>
                  <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Remaining</th>
                  {canApprove ? <th className="px-6 py-3 text-right text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Action</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/4 bg-surface">
                {paged.map((g) => (
                  <tr
                    key={g.memberId}
                    className="transition-colors hover:bg-black/[0.02] cursor-pointer"
                    onClick={() => { setDetailMemberId(g.memberId); setDetailOpen(true); }}
                  >
                    <td className="px-6 py-3 sticky left-0 bg-white z-10 border-r border-neutral-100 w-[240px] max-w-[240px] overflow-hidden">
                      <SummaryEmployeeCell name={g.name} />
                    </td>
                    <td className="px-6 py-3 font-mono text-neutral-900 tabular-nums">{g.totalAllocated}</td>
                    <td className="px-6 py-3 font-mono text-neutral-900 tabular-nums">{g.totalUsed}</td>
                    <td className="px-6 py-3 font-mono font-semibold text-primary tabular-nums">{g.totalRemaining}</td>
                    {canApprove ? (
                      <td className="px-6 py-3 text-right">
                        <Button
                          variant="ghost"
                          className="h-7 rounded-full px-3 text-xs text-neutral-600 hover:bg-black/[0.03]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailMemberId(g.memberId);
                            setDetailOpen(true);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="border-t border-black/[0.04] px-8 py-6">
          <EmployeePagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            onPageSizeChange={() => {}}
          />
        </div>
      )}

      <EmployeeBalanceDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        employeeName={detailEmployee?.name ?? ''}
        balances={detailEmployee?.items ?? []}
        onEdit={(b) => {
          setSelectedBalance(b);
          setAssignOpen(true);
        }}
      />

      {canApprove ? (
        <LeaveBalanceAssignmentSheet
          open={assignOpen}
          onOpenChange={setAssignOpen}
          orgSlug={orgSlug}
          memberId={memberId}
          members={members}
          leaveTypes={leaveTypes}
          balance={selectedBalance}
        />
      ) : null}
    </Card>
  );
}

// ─── Leave Types ──────────────────────────────────────────────────────────────

export function LeaveTypesView() {
  const { canApprove, leaveTypes, leaveTypesLoading, openLeaveTypeDialog } = useLeaveShell();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const filtered = search.trim()
    ? leaveTypes.filter((t: LeaveTypeRecord) => t.name.toLowerCase().includes(search.toLowerCase()))
    : leaveTypes;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const ltEmptyTitle = search ? 'No leave types match your search.' : 'No leave types configured';
  const ltEmptyBody = search ? 'Try a different search term.' : 'Create your first leave type to start shaping the policy layer.';

  if (!canApprove) {
    return (
      <Card>
        <SectionEmpty title="Restricted section" body="Only organization-level approvers can manage leave types." />
      </Card>
    );
  }

  return (
    <Card>
      <Toolbar>
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search leave types…" />
        {/* spacer */}
        <div className="flex-1" />
        <Button
          className="h-9 rounded-lg bg-gradient-to-br from-[#3862f6] to-[#6366f1] px-4 text-sm font-bold text-white shadow-[0_4px_12px_rgba(56,98,246,0.15)]"
          onClick={() => openLeaveTypeDialog()}
        >
          New Leave Type
        </Button>
      </Toolbar>

      {leaveTypesLoading && (
        <div className="flex flex-col divide-y divide-black/4 bg-surface px-4">
          {['a','b','c','d'].map((k) => (
            <div key={`lt-${k}`} className="border-b border-black/4 px-6 py-3">
              <div className="h-5 w-full animate-pulse rounded-md bg-neutral-100" />
            </div>
          ))}
        </div>
      )}
      {!leaveTypesLoading && filtered.length === 0 && (
        <SectionEmpty title={ltEmptyTitle} body={ltEmptyBody} />
      )}
      {!leaveTypesLoading && filtered.length > 0 && (
        <>
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
                {paged.map((t: LeaveTypeRecord) => (
                  <tr key={t.id} className="transition-colors hover:bg-black/[0.02]">
                    <td className="px-6 py-3 font-medium text-neutral-900">{t.name}</td>
                    <td className="px-6 py-3 font-mono text-neutral-700">{t.quota}</td>
                    <td className="px-6 py-3 text-neutral-700">{t.carryForward ? 'Enabled' : 'Off'}</td>
                    <td className="px-6 py-3 text-neutral-700">{t.isPaid ? 'Yes' : 'No'}</td>
                    <td className="px-6 py-3 text-right">
                      <Button
                        variant="ghost"
                        className="h-7 rounded-md px-3 text-xs text-neutral-600 hover:bg-black/[0.03]"
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
          <div className="border-t border-black/[0.04] px-8 py-6">
            <EmployeePagination
              page={page}
              totalPages={totalPages}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          </div>
        </>
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
            className="h-7 rounded-md px-3 text-xs text-neutral-600 hover:bg-black/[0.03]"
            onClick={() => handlers.onEdit(row.original)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            className="h-7 rounded-md px-3 text-xs text-destructive-text hover:bg-destructive-bg"
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
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const query = useQuery({
    queryKey: ['holidays-all', orgSlug, memberId],
    queryFn: () => fetchHolidaysAction({ orgSlug, memberId, page: 1, pageSize: 500 }),
    enabled: !!orgSlug && !!memberId,
    placeholderData: (prev) => prev,
  });

  const allHolidays = query.data?.items ?? EMPTY_HOLIDAYS;

  const filtered = React.useMemo(() => {
    let items = allHolidays;
    if (month > 0) {
      items = items.filter((h) => dateOnlyMonth(h.holidayDate) === month);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((h) => h.name.toLowerCase().includes(q));
    }
    return items;
  }, [allHolidays, month, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = React.useMemo(
    () => buildHolidayColumns({ canApprove, onEdit: openHolidayDialog, onDelete: (id) => void deleteHoliday(id) }),
    [canApprove, openHolidayDialog, deleteHoliday],
  );

  const table = useReactTable({
    data: paged,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const holEmptyBody = search || month > 0
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
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search holidays…"
        />
        <Select value={String(month)} onValueChange={(v) => { setMonth(Number(v)); setPage(1); }}>
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
            className="h-8 rounded-md px-4 text-sm text-neutral-700"
            onClick={() => void syncHolidays()}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Sync Public Holidays
          </Button>
        )}
        <Button
          className="h-9 rounded-lg bg-gradient-to-br from-[#3862f6] to-[#6366f1] px-4 text-sm font-bold text-white shadow-[0_4px_12px_rgba(56,98,246,0.15)]"
          onClick={() => openHolidayDialog()}
        >
          New Holiday
        </Button>
      </Toolbar>

      <div className={cn('transition-opacity', query.isFetching && !query.isLoading ? 'opacity-60' : 'opacity-100')}>
        {query.isLoading && (
          <div className="flex flex-col divide-y divide-black/4 bg-surface px-4">
            {['a','b','c','d','e'].map((k) => (
              <div key={`hol-${k}`} className="border-b border-black/4 p-6">
                <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
              </div>
            ))}
          </div>
        )}
        {!query.isLoading && filtered.length === 0 && (
          <SectionEmpty title="No holidays found" body={holEmptyBody} />
        )}
        {!query.isLoading && filtered.length > 0 && (
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

      {filtered.length > 0 && (
        <div className="border-t border-black/[0.04] px-8 py-6">
          <EmployeePagination
            page={page}
            totalPages={totalPages}
            total={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            onPageSizeChange={() => {}}
          />
        </div>
      )}
    </Card>
  );
}

// ─── Leave Summary ───────────────────────────────────────────────────────────

function SummaryEmployeeCell({ name }: { readonly name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
        {initials}
      </div>
      <div className="flex flex-col min-w-0 overflow-hidden">
        <span className="text-[13px] font-medium text-neutral-900 leading-tight truncate" title={name}>
          {name}
        </span>
        <span className="text-[11px] text-neutral-400 leading-tight">No Dept</span>
      </div>
    </div>
  );
}

function TooltipPopover({ items }: { readonly items: LeaveSummaryRequestItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setOpen(!open); }}
            className="ml-1 inline-flex items-center justify-center size-4 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <Info className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent hideArrow side="right" align="start" className="p-3 shadow-sm bg-white text-neutral-900 border border-neutral-200 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <SummaryTooltipContent items={items} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SummaryTooltipContent({ items }: { readonly items: LeaveSummaryRequestItem[] }) {
  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const start = format(parseISO(item.startDate), 'MMM d');
        const end = format(parseISO(item.endDate), 'MMM d, yyyy');
        return (
          <div key={item.id} className="text-xs text-neutral-700 leading-relaxed whitespace-nowrap">
            <span className="font-medium">{item.leaveTypeName}</span>
            <span className="text-neutral-400"> &middot; {start}&ndash;{end} ({item.days}d)</span>
          </div>
        );
      })}
    </div>
  );
}

function yearFromDate(dateStr: string): number {
  return dateOnlyYear(dateStr);
}

function monthFromDate(dateStr: string): number {
  return dateOnlyMonth(dateStr);
}

const PAGE_SIZE = 10;

function FilterActions({ onCancel, onApply }: { onCancel: () => void; onApply: () => void }) {
  const { closeFloatingPanel } = useFloatingPanel();
  return (
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => { onCancel(); closeFloatingPanel(); }}>
        Cancel
      </Button>
      <Button className="flex-1 h-9 text-sm rounded-lg bg-gradient-to-br from-[#3862f6] to-[#6366f1] font-bold text-white shadow-[0_4px_12px_rgba(56,98,246,0.15)]" onClick={() => { onApply(); closeFloatingPanel(); }}>
        Apply
      </Button>
    </div>
  );
}

export function LeaveSummaryView() {
  const { orgSlug, memberId, canApprove } = useLeaveShell();
  const [search, setSearch] = useState('');
  const [appliedYear, setAppliedYear] = useState(new Date().getFullYear());
  const [appliedMonth, setAppliedMonth] = useState(0);
  const [appliedLeaveFilter, setAppliedLeaveFilter] = useState('all');
  const [pendingYear, setPendingYear] = useState(new Date().getFullYear());
  const [pendingMonth, setPendingMonth] = useState(0);
  const [pendingLeaveFilter, setPendingLeaveFilter] = useState('all');
  const [page, setPage] = useState(1);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const availableYears = Array.from({ length: 3 }, (_, i) => currentYear - 2 + i).filter((y) => y <= currentYear);
  const availableMonths = React.useMemo(
    () =>
      pendingYear < currentYear
        ? MONTH_OPTIONS
        : MONTH_OPTIONS.filter((opt) => opt.value === '0' || Number(opt.value) <= currentMonth),
    [currentMonth, currentYear, pendingYear],
  );
  const hasActiveFilters = appliedMonth > 0 || appliedLeaveFilter !== 'all';

  const {
    data,
    isLoading,
    isFetching,
  } = useLeaveSummary(orgSlug, memberId, { enabled: canApprove });

  const allItems = data?.items ?? EMPTY_SUMMARY_ITEMS;

  const filtered = React.useMemo(() => {
    let items = allItems;

    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (emp) =>
          (emp.name ?? '').toLowerCase().includes(q) ||
          (emp.email ?? '').toLowerCase().includes(q),
      );
    }

    items = items.map((emp) => {
      const filteredItems = emp.items.filter((item) => {
        const itemYear = yearFromDate(item.startDate);
        if (itemYear !== appliedYear) return false;
        if (appliedMonth > 0 && monthFromDate(item.startDate) !== appliedMonth) return false;
        return true;
      });
      const totalDays = filteredItems.reduce((sum, i) => sum + i.days, 0);
      return { ...emp, items: filteredItems, totalDays };
    });

    return items;
  }, [allItems, search, appliedYear, appliedMonth]);

  const leaveFiltered = React.useMemo(() => {
    if (appliedLeaveFilter === 'took') return filtered.filter((emp) => emp.totalDays > 0);
    if (appliedLeaveFilter === 'not-took') return filtered.filter((emp) => emp.totalDays === 0);
    return filtered;
  }, [filtered, appliedLeaveFilter]);

  const totalFiltered = leaveFiltered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const paged = leaveFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!canApprove) {
    return (
      <Card>
        <SectionEmpty title="Restricted section" body="Only organization-level approvers can view the leave summary." />
      </Card>
    );
  }

  return (
    <FloatingPanelRoot>
      <Card>
        <Toolbar>
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by employee name or email…"
          />
          <div className="flex-1" />
          <span className="text-xs text-neutral-400">
            {totalFiltered > 0 ? `${totalFiltered} employee${totalFiltered === 1 ? '' : 's'}` : ''}
          </span>
          {hasActiveFilters && (
            <Badge asChild variant="default" className="cursor-pointer gap-1.5 bg-primary/10 text-primary border-transparent hover:bg-primary/20">
              <button type="button" onClick={() => { setAppliedMonth(0); setAppliedLeaveFilter('all'); setPage(1); }}>
                <span className="size-1.5 rounded-full bg-current" />
                Filters applied
                <X className="size-3" data-icon="inline-end" />
              </button>
            </Badge>
          )}
          <FloatingPanelTrigger title="Filters" className="h-9 rounded-lg border border-black/[0.08] bg-canvas px-3 text-sm text-neutral-600 hover:bg-neutral-100">
            <IoFilterSharp className="mr-1.5 size-4" />
            Filters
          </FloatingPanelTrigger>
        </Toolbar>

        <div className={cn('transition-opacity', isFetching && !isLoading ? 'opacity-60' : 'opacity-100')}>
          {isLoading && (
            <div className="flex flex-col divide-y divide-black/4 bg-surface px-4">
              {['a','b','c','d','e'].map((k) => (
                <div key={`sum-${k}`} className="border-b border-black/4 px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 animate-pulse rounded-lg bg-neutral-100" />
                    <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && paged.length === 0 && (
            <SectionEmpty
              title={search.trim() || hasActiveFilters ? 'No employees match your search or filters' : 'No approved leave records found'}
              body="Try a different year, month, or search term."
            />
          )}
          {!isLoading && paged.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/[0.04] bg-canvas/50">
                    <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider w-[280px] max-w-[280px]">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">
                      Leave Count
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/4 bg-surface">
                  {paged.map((emp: EmployeeLeaveSummary) => (
                    <tr key={emp.memberId} className="transition-colors hover:bg-black/[0.02]">
                      <td className="px-6 py-3 w-[280px] max-w-[280px] overflow-hidden">
                        <SummaryEmployeeCell name={emp.name ?? emp.email ?? 'Unnamed'} />
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-900 tabular-nums">{emp.totalDays}</span>
                          {emp.items.length > 0 && (
                            <TooltipPopover items={emp.items} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalFiltered > PAGE_SIZE && (
          <div className="border-t border-black/[0.04] px-8 py-6">
            <EmployeePagination
              page={page}
              totalPages={totalPages}
              total={totalFiltered}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          </div>
        )}
      </Card>

      <FloatingPanelContent align="end" closeOnOutsideClick={false} className="w-[260px]">
        <FloatingPanelBody className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-500 uppercase tracking-wider">Year</label>
            <Select value={String(pendingYear)} onValueChange={(v) => setPendingYear(Number(v))}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-sm">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-500 uppercase tracking-wider">Month</label>
            <Select value={String(pendingMonth)} onValueChange={(v) => setPendingMonth(Number(v))}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-sm">{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-neutral-500 uppercase tracking-wider">Leave Status</label>
            <Select value={pendingLeaveFilter} onValueChange={(v) => setPendingLeaveFilter(v)}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="took">Took Leave</SelectItem>
                <SelectItem value="not-took">Not Took Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <FilterActions
            onCancel={() => {
              setPendingYear(appliedYear);
              setPendingMonth(appliedMonth);
              setPendingLeaveFilter(appliedLeaveFilter);
            }}
            onApply={() => {
              setAppliedYear(pendingYear);
              setAppliedMonth(pendingMonth);
              setAppliedLeaveFilter(pendingLeaveFilter);
              setPage(1);
            }}
          />
        </FloatingPanelBody>
      </FloatingPanelContent>
    </FloatingPanelRoot>
  );
}

// ─── Leave History ────────────────────────────────────────────────────────────

function HistoryEmployeeCell({ name }: { readonly name: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
        {initials}
      </div>
      <div className="flex flex-col min-w-0 overflow-hidden">
        <span className="text-[13px] font-medium text-neutral-900 leading-tight truncate" title={name}>
          {name}
        </span>
        <span className="text-[11px] text-neutral-400 leading-tight">No Dept</span>
      </div>
    </div>
  );
}

function HistoryReasonCell({ reason }: { readonly reason: string | null }) {
  if (!reason) return <span className="text-neutral-400">&mdash;</span>;
  return (
    <span className="text-neutral-700 max-w-[200px] inline-block truncate" title={reason}>
      {reason}
    </span>
  );
}

const HISTORY_PAGE_SIZE = 10;

export function LeaveHistoryView() {
  const { orgSlug, memberId, openRequestDetails } = useLeaveShell();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'latest' | 'oldest'>('latest');
  const [page, setPage] = useState(1);

  const requestsQuery = useLeaveHistory(orgSlug, memberId);

  const allRequests = requestsQuery.data?.items ?? EMPTY_REQUESTS;

  const filtered = React.useMemo(() => {
    let items = allRequests.filter((r) => r.status === 'APPROVED');

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
    if (sort === 'oldest') {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [allRequests, search, sort]);

  const totalFiltered = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / HISTORY_PAGE_SIZE));
  const paged = filtered.slice((page - 1) * HISTORY_PAGE_SIZE, page * HISTORY_PAGE_SIZE);

  return (
    <Card>
      <Toolbar>
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by name, email, or leave type…"
        />
        <Select value={sort} onValueChange={(v) => { setSort(v as 'latest' | 'oldest'); setPage(1); }}>
          <SelectTrigger className="h-9 w-[140px] text-sm border-0 bg-canvas">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <span className="text-xs text-neutral-400">
          {totalFiltered > 0 ? `${totalFiltered} request${totalFiltered === 1 ? '' : 's'}` : ''}
        </span>
      </Toolbar>

      {requestsQuery.isLoading && (
        <div className="flex flex-col divide-y divide-black/4 bg-surface px-4">
          {['a','b','c','d','e'].map((k) => (
            <div key={`hist-${k}`} className="border-b border-black/4 px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 animate-pulse rounded-lg bg-neutral-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!requestsQuery.isLoading && paged.length === 0 && (
        <SectionEmpty title="No leave history found" body={search ? 'Try adjusting your search.' : 'Leave requests will appear here once submitted.'} />
      )}
      {!requestsQuery.isLoading && paged.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/[0.04] bg-canvas/50">
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider w-[220px] max-w-[220px]">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Leave Type</th>
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Start Date</th>
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">End Date</th>
                <th className="px-6 py-3 text-left text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Reason</th>
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
                  <td className="px-6 py-3 w-[220px] max-w-[220px] overflow-hidden">
                    <HistoryEmployeeCell name={r.member.name ?? r.member.email ?? 'Unnamed'} />
                  </td>
                  <td className="px-6 py-3 text-neutral-700">{r.leaveType.name}</td>
                  <td className="px-6 py-3 text-neutral-700 whitespace-nowrap">{format(parseISO(r.startDate), 'MMM d, yyyy')}</td>
                  <td className="px-6 py-3 text-neutral-700 whitespace-nowrap">{format(parseISO(r.endDate), 'MMM d, yyyy')}</td>
                  <td className="px-6 py-3 pr-8">
                    <HistoryReasonCell reason={r.reason} />
                  </td>
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
      )}

      {totalFiltered > HISTORY_PAGE_SIZE && (
        <div className="border-t border-black/[0.04] px-8 py-6">
          <EmployeePagination
            page={page}
            totalPages={totalPages}
            total={totalFiltered}
            pageSize={HISTORY_PAGE_SIZE}
            onPageChange={setPage}
            onPageSizeChange={() => {}}
          />
        </div>
      )}
    </Card>
  );
}
