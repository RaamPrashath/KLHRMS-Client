'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import {
  AlertTriangle,
  DoorOpen,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  ShieldX,
  User2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  useAccessAssignmentsQuery,
  useAccessControlMutations,
} from '@/modules/assets/hooks/useAccessControlQuery';
import { useEmployeesQuery } from '@/modules/employees/hooks/useEmployeesQuery';
import { formatDate, humanize } from '@/modules/assets/lib/assetUtils';
import type { AccessControlAssignmentItem } from '@/modules/assets/types/accessControlTypes';
import type { EmployeeListItem } from '@/modules/employees/types/employeeTypes';

const POINTS = ['Front Door', 'Meeting Room', 'Server Room', 'HR Office', 'Parking Gate'];

function employeeDisplayName(employee: EmployeeListItem): string {
  return employee.name.trim() || employee.email.trim() || employee.member_id;
}

// ── Assign Dialog ────────────────────────────────────────────────────────────

function GrantAccessDialog({
  open,
  onOpenChange,
  orgSlug,
  memberId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  memberId: string;
}) {
  const mutations = useAccessControlMutations(orgSlug, memberId);
  const employeesQuery = useEmployeesQuery(orgSlug, memberId);
  const employees = employeesQuery.data?.items ?? [];

  const [employeeQuery, setEmployeeQuery] = useState('');
  const [selectedEmployeeMemberId, setSelectedEmployeeMemberId] = useState<string | null>(null);
  const [accessPointQuery, setAccessPointQuery] = useState('');
  const [selectedAccessPoint, setSelectedAccessPoint] = useState<string | null>(null);
  const [isEmployeeOpen, setIsEmployeeOpen] = useState(false);
  const [isAccessPointOpen, setIsAccessPointOpen] = useState(false);

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.member_id === selectedEmployeeMemberId) ?? null,
    [employees, selectedEmployeeMemberId],
  );

  const filteredEmployees = useMemo(() => {
    const query = employeeQuery.toLowerCase().trim();
    if (!query) return employees;

    return employees.filter((employee) => {
      const displayName = employeeDisplayName(employee).toLowerCase();
      return (
        displayName.includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.member_id.toLowerCase().includes(query)
      );
    });
  }, [employeeQuery, employees]);

  const filteredAccessPoints = useMemo(() => {
    const query = accessPointQuery.toLowerCase().trim();
    if (!query) return POINTS;
    return POINTS.filter((point) => point.toLowerCase().includes(query));
  }, [accessPointQuery]);

  function resetForm() {
    setEmployeeQuery('');
    setSelectedEmployeeMemberId(null);
    setAccessPointQuery('');
    setSelectedAccessPoint(null);
  }

  async function handleGrant() {
    if (!selectedEmployeeMemberId || !selectedAccessPoint) return;
    await mutations.createAssignment.mutateAsync({
      employeeMemberId: selectedEmployeeMemberId,
      accessPoint: selectedAccessPoint,
      status: 'ACTIVE',
    });
    resetForm();
    onOpenChange(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative z-10 mx-4 w-full max-w-md rounded-[20px] bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4">
              <h2 className="text-[16px] font-semibold text-[#111827]">Grant Access</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-7 items-center justify-center rounded-full text-[#9ca3af] hover:text-[#6b7280]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#6b7280]">Employee</label>
                <Combobox
                  open={isEmployeeOpen}
                  onOpenChange={(nextOpen) => {
                    setIsEmployeeOpen(nextOpen);
                    if (!nextOpen) {
                      setEmployeeQuery(selectedEmployee ? employeeDisplayName(selectedEmployee) : '');
                    }
                  }}
                  value={selectedEmployee ? employeeDisplayName(selectedEmployee) : null}
                  onValueChange={(value) => {
                    const employee = employees.find((item) => employeeDisplayName(item) === value);
                    setSelectedEmployeeMemberId(employee?.member_id ?? null);
                    setEmployeeQuery(employee ? employeeDisplayName(employee) : '');
                  }}
                  inputValue={employeeQuery}
                  onInputValueChange={setEmployeeQuery}
                >
                  <div className="flex items-center rounded-lg border border-[#e5e7eb] bg-white px-3">
                    <User2 className="mr-2 size-4 shrink-0 text-[#9ca3af]" />
                    <ComboboxInput
                      placeholder="Search employee name, email, or member ID..."
                      showTrigger={false}
                      showClear={false}
                      className="w-full border-0 bg-transparent shadow-none [&>div]:h-9 [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none"
                    />
                    <ComboboxTrigger className="ml-1 text-[#9ca3af]" />
                  </div>
                  <ComboboxContent className="rounded-lg border border-[#e2e5ea] p-1 shadow-none">
                    <ComboboxList>
                      {employeesQuery.isLoading ? (
                        <div className="px-3 py-4 text-center text-[13px] text-[#9ca3af]">Loading employees...</div>
                      ) : filteredEmployees.length === 0 ? (
                        <ComboboxEmpty>No employees found</ComboboxEmpty>
                      ) : (
                        filteredEmployees.map((employee) => (
                          <ComboboxItem
                            key={employee.member_id}
                            value={employeeDisplayName(employee)}
                            className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] data-selected:bg-[#f8f9fa]"
                          >
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#fafafa] text-[#6b7280]">
                              <User2 className="size-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-[#111827]">{employeeDisplayName(employee)}</p>
                              <p className="truncate text-[11px] text-[#6b7280]">
                                {employee.email} · {employee.member_id}
                              </p>
                            </div>
                          </ComboboxItem>
                        ))
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#6b7280]">Access Point</label>
                <Combobox
                  open={isAccessPointOpen}
                  onOpenChange={(nextOpen) => {
                    setIsAccessPointOpen(nextOpen);
                    if (!nextOpen) {
                      setAccessPointQuery(selectedAccessPoint ?? '');
                    }
                  }}
                  value={selectedAccessPoint}
                  onValueChange={(value) => {
                    setSelectedAccessPoint(value as string);
                    setAccessPointQuery(value as string);
                  }}
                  inputValue={accessPointQuery}
                  onInputValueChange={setAccessPointQuery}
                >
                  <div className="flex items-center rounded-lg border border-[#e5e7eb] bg-white px-3">
                    <DoorOpen className="mr-2 size-4 shrink-0 text-[#9ca3af]" />
                    <ComboboxInput
                      placeholder="Search access point..."
                      showTrigger={false}
                      showClear={false}
                      className="w-full border-0 bg-transparent shadow-none [&>div]:h-9 [&>div]:border-0 [&>div]:bg-transparent [&>div]:shadow-none"
                    />
                    <ComboboxTrigger className="ml-1 text-[#9ca3af]" />
                  </div>
                  <ComboboxContent className="rounded-lg border border-[#e2e5ea] p-1 shadow-none">
                    <ComboboxList>
                      {filteredAccessPoints.length === 0 ? (
                        <ComboboxEmpty>No access points found</ComboboxEmpty>
                      ) : (
                        filteredAccessPoints.map((point) => (
                          <ComboboxItem
                            key={point}
                            value={point}
                            className="rounded-md px-3 py-2.5 text-[13px] font-medium text-[#111827] data-selected:bg-[#f8f9fa]"
                          >
                            {point}
                          </ComboboxItem>
                        ))
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
              <Button
                onClick={handleGrant}
                disabled={!selectedEmployeeMemberId || !selectedAccessPoint || mutations.createAssignment.isPending}
                className="mt-2 h-9 w-full rounded-lg bg-[#1d1d1f] text-[13px] font-medium text-white hover:bg-[#333]"
              >
                {mutations.createAssignment.isPending ? 'Granting...' : 'Grant Access'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ── Main Tab ─────────────────────────────────────────────────────────────────

export function AccessControlTab({
  orgSlug,
  memberId,
}: {
  orgSlug: string;
  memberId: string;
}) {
  const [assignPage, setAssignPage] = useState(1);
  const [assignStatus, setAssignStatus] = useState<string>('ALL');
  const [assignPoint, setAssignPoint] = useState<string>('ALL');
  const [assignSorting, setAssignSorting] = useState<SortingState>([{ id: 'grantedAt', desc: true }]);

  const [grantDialogOpen, setGrantDialogOpen] = useState(false);

  const pageSize = 10;

  const assignmentsQuery = useAccessAssignmentsQuery(orgSlug, memberId, {
    page: assignPage,
    pageSize,
    status: assignStatus !== 'ALL' ? assignStatus : undefined,
    accessPoint: assignPoint !== 'ALL' ? assignPoint : undefined,
  });

  const mutations = useAccessControlMutations(orgSlug, memberId);

  const assignments = assignmentsQuery.data?.items ?? [];
  const assignmentsTotal = assignmentsQuery.data?.total ?? 0;
  const assignmentsPageCount = Math.max(1, Math.ceil(assignmentsTotal / pageSize));

  // ── Assignment columns ───────────────────────────────────────────────────

  const assignColumns = useMemo(
    () => [
      {
        id: 'employeeName',
        header: 'Employee',
        accessorFn: (row: AccessControlAssignmentItem) => row.employeeName ?? '',
        cell: ({ row: r }: { row: { original: AccessControlAssignmentItem } }) => {
          const item = r.original;
          return (
            <div className="flex items-center gap-2">
              <User2 className="size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">{item.employeeName || '—'}</p>
                <p className="truncate text-[11px] text-muted-foreground">{item.employeeEmail || ''}</p>
              </div>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'accessPoint',
        header: 'Access Point',
        accessorFn: (row: AccessControlAssignmentItem) => row.accessPoint,
        cell: ({ getValue }: { getValue: () => string }) => (
          <div className="flex items-center gap-1.5">
            <DoorOpen className="size-3.5 text-muted-foreground" />
            <span className="text-[13px] text-slate-700 dark:text-slate-350 font-medium">{getValue()}</span>
          </div>
        ),
        enableSorting: true,
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row: AccessControlAssignmentItem) => row.status,
        cell: ({ row: r }: { row: { original: AccessControlAssignmentItem } }) => {
          const item = r.original;
          const isActive = item.status === 'ACTIVE';
          return (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  mutations.toggleAssignment.mutate({
                    assignmentId: item.id,
                    status: isActive ? 'DISABLED' : 'ACTIVE',
                  })
                }
                disabled={mutations.toggleAssignment.isPending}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-colors border',
                  isActive
                    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                    : 'border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20',
                )}
              >
                {isActive ? <ShieldCheck className="size-3" /> : <ShieldX className="size-3" />}
                {isActive ? 'Using' : 'Not Using'}
              </button>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'grantedByName',
        header: 'Granted By',
        accessorFn: (row: AccessControlAssignmentItem) => row.grantedByName ?? '',
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] text-slate-705 dark:text-slate-350 font-medium">{getValue() || '—'}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'grantedAt',
        header: 'Granted',
        accessorFn: (row: AccessControlAssignmentItem) => row.grantedAt,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] tabular-nums text-slate-755 dark:text-slate-300 font-medium">{formatDate(getValue())}</span>
        ),
        enableSorting: true,
      },
    ],
    [mutations.toggleAssignment],
  );

  // ── Tables ───────────────────────────────────────────────────────────────

  const assignTable = useReactTable({
    data: assignments,
    columns: assignColumns,
    state: { sorting: assignSorting },
    onSortingChange: setAssignSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: assignmentsPageCount,
  });

  // ── Filters Bar ──────────────────────────────────────────────────────────

  function AssignFilters() {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Status</span>
          <Select value={assignStatus} onValueChange={(v) => { setAssignStatus(v); setAssignPage(1); }}>
            <SelectTrigger className="h-8 w-[110px] rounded-lg border-[#e5e7eb] text-[12px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-[12px]">All</SelectItem>
              <SelectItem value="ACTIVE" className="text-[12px]">Using</SelectItem>
              <SelectItem value="DISABLED" className="text-[12px]">Not Using</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Point</span>
          <Select value={assignPoint} onValueChange={(v) => { setAssignPoint(v); setAssignPage(1); }}>
            <SelectTrigger className="h-8 w-[120px] rounded-lg border-[#e5e7eb] text-[12px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-[12px]">All</SelectItem>
              {POINTS.map((p) => (
                <SelectItem key={p} value={p} className="text-[12px]">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  const paginationPages = useMemo(() => {
    if (assignmentsPageCount <= 7) {
      return Array.from({ length: assignmentsPageCount }, (_, i) => i + 1);
    }
    const pages: (number | 'ellipsis')[] = [1];
    if (assignPage > 3) pages.push('ellipsis');
    const start = Math.max(2, assignPage - 1);
    const end = Math.min(assignmentsPageCount - 1, assignPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (assignPage < assignmentsPageCount - 2) pages.push('ellipsis');
    pages.push(assignmentsPageCount);
    return pages;
  }, [assignPage, assignmentsPageCount]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      <div className="mb-5">
        <h2 className="text-[18px] font-semibold text-[#111827]">Access Control</h2>
        <p className="mt-0.5 text-[13px] text-[#6b7280]">
          Monitor door entries and manage employee access permissions
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
        {assignmentsQuery.isLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60 border border-border" />
            ))}
          </div>
        ) : assignmentsQuery.isError ? (
          <div className="flex items-center justify-center bg-card px-6 py-14 text-center">
            <div>
              <AlertTriangle className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-[14px] font-semibold text-foreground">Failed to load assignments</p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">Try refreshing the page</p>
            </div>
          </div>
        ) : (
          <div>
            {/* Card Header inside container */}
            <div className="px-8 py-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <AssignFilters />
                <Button
                  onClick={() => setGrantDialogOpen(true)}
                  className="btn-primary-grad h-9 text-[13px] font-semibold flex items-center gap-2 shrink-0 border-0"
                >
                  <UserCheck className="size-4 text-white" />
                  Grant Access
                </Button>
              </div>
            </div>

            {assignments.length === 0 ? (
              <div className="flex items-center justify-center bg-card px-6 py-14 text-center">
                <div>
                  <ShieldCheck className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-2 text-[14px] font-semibold text-foreground">No access assignments yet</p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">Grant access to employees to manage door permissions</p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {assignTable.getHeaderGroups().map((hg) => (
                        <TableRow key={hg.id} className="border-b border-border bg-slate-50/50 dark:bg-slate-900/10 hover:bg-transparent">
                          {hg.headers.map((header) => (
                            <TableHead
                              key={header.id}
                              className="h-11 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider"
                            >
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {assignTable.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          className="border-b border-border hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="px-6 py-3.5 text-slate-705 dark:text-slate-350 align-middle font-medium">
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {assignmentsTotal > 0 && (
                  <div className="p-4 bg-slate-50/30 dark:bg-slate-900/10 border-t border-border text-xs text-muted-foreground flex justify-between items-center shrink-0">
                    <span className="font-semibold text-muted-foreground">
                      Showing {Math.min((assignPage - 1) * pageSize + 1, assignmentsTotal)}-
                      {Math.min(assignPage * pageSize, assignmentsTotal)}
                      {' '}of {assignmentsTotal} entries
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignPage((prev) => Math.max(1, prev - 1))}
                        disabled={assignPage <= 1}
                        className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
                      >
                        Previous
                      </Button>
                      {paginationPages.map((p, idx) =>
                        p === 'ellipsis' ? (
                          <span key={`e-${idx}`} className="flex size-7 items-center justify-center text-[12px] text-muted-foreground">
                            &hellip;
                          </span>
                        ) : (
                          <Button
                            key={p}
                            variant={assignPage === p ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setAssignPage(p)}
                            className={cn(
                              'h-7 min-w-7 rounded-lg px-1 text-[11px] font-semibold',
                              assignPage === p
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'border-border text-muted-foreground bg-card hover:bg-muted',
                            )}
                          >
                            {p}
                          </Button>
                        ),
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssignPage((prev) => Math.min(assignmentsPageCount, prev + 1))}
                        disabled={assignPage >= assignmentsPageCount}
                        className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <GrantAccessDialog
        open={grantDialogOpen}
        onOpenChange={setGrantDialogOpen}
        orgSlug={orgSlug}
        memberId={memberId}
      />
    </div>
  );
}
