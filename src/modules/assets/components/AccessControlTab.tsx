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
  CalendarClock,
  ChevronDown,
  ChevronUp,
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
  useAccessLogsQuery,
  useAccessLogSummaryQuery,
} from '@/modules/assets/hooks/useAccessControlQuery';
import { useEmployeesQuery } from '@/modules/employees/hooks/useEmployeesQuery';
import { formatDate, humanize } from '@/modules/assets/lib/assetUtils';
import type { AccessControlAssignmentItem, AccessControlLogItem } from '@/modules/assets/types/accessControlTypes';
import type { EmployeeListItem } from '@/modules/employees/types/employeeTypes';

type SubTab = 'logs' | 'assignments';

const ENTRY_METHODS = ['CARD_SWIPE', 'BIOMETRIC', 'MANUAL', 'QR_CODE', 'KEYPAD'];
const LOG_STATUSES = ['GRANTED', 'DENIED', 'EXPIRED'];
const DIRECTIONS = ['IN', 'OUT'];
const POINTS = ['Front Door', 'Meeting Room', 'Server Room', 'HR Office', 'Parking Gate'];

function employeeDisplayName(employee: EmployeeListItem): string {
  return employee.name.trim() || employee.email.trim() || employee.member_id;
}

// ── Detail Dialog ────────────────────────────────────────────────────────────

function AccessLogDetailDialog({
  item,
  open,
  onOpenChange,
}: {
  item: AccessControlLogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!item) return null;

  const statusBadge = (status: string) => {
    const m: Record<string, string> = {
      GRANTED: 'bg-[#f3fbf5] text-[#156f3d]',
      DENIED: 'bg-[#fff3f2] text-[#b3261e]',
      EXPIRED: 'bg-[#fff7e8] text-[#8a5a00]',
    };
    return m[status] || 'bg-[#f3f4f6] text-[#6b7280]';
  };

  const methodIcon = (method: string) => {
    const icons: Record<string, typeof Fingerprint> = {
      CARD_SWIPE: KeyRound,
      BIOMETRIC: Fingerprint,
      MANUAL: UserCheck,
      QR_CODE: ShieldCheck,
      KEYPAD: KeyRound,
    };
    const Icon = icons[method] || KeyRound;
    return <Icon className="size-3.5" />;
  };

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
            className="relative z-10 mx-4 w-full max-w-lg rounded-[20px] bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[#eef0f3] px-6 py-4">
              <h2 className="text-[16px] font-semibold text-[#111827]">Access Log Details</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex size-7 items-center justify-center rounded-full text-[#9ca3af] hover:text-[#6b7280]"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                  Entry Details
                </h3>
                <div className="space-y-3 rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="size-4 text-[#6b7280]" />
                      <span className="text-[15px] font-semibold text-[#111827]">{item.accessPoint}</span>
                    </div>
                    <Badge className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium border-0', statusBadge(item.status))}>
                      {humanize(item.status)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div>
                      <span className="text-[#86868b]">Direction</span>
                      <p className="font-medium text-[#1d1d1f]">{item.direction === 'IN' ? 'Entry' : 'Exit'}</p>
                    </div>
                    <div>
                      <span className="text-[#86868b]">Method</span>
                      <p className="flex items-center gap-1 font-medium text-[#1d1d1f]">
                        {methodIcon(item.entryMethod)}
                        {humanize(item.entryMethod)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#86868b]">Date & Time</span>
                      <p className="font-medium text-[#1d1d1f]">{formatDate(item.enteredAt)}</p>
                    </div>
                    <div>
                      <span className="text-[#86868b]">Active</span>
                      <p className="font-medium text-[#1d1d1f]">{item.isActive ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                  Employee
                </h3>
                <div className="space-y-3 rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                  <div className="flex items-center gap-2">
                    <User2 className="size-4 text-[#6b7280]" />
                    <span className="text-[13px] font-medium text-[#1d1d1f]">{item.employeeName || 'Unknown'}</span>
                  </div>
                  {item.employeeEmail && (
                    <p className="text-[12px] text-[#6e6e73]">{item.employeeEmail}</p>
                  )}
                </div>
              </div>

              {item.notes && (
                <div>
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868b]">
                    Notes
                  </h3>
                  <div className="rounded-[14px] border border-[#eef0f3] bg-[#fbfcfb] p-4">
                    <p className="text-[13px] text-[#1d1d1f]">{item.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
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
  const [subTab, setSubTab] = useState<SubTab>('logs');

  const [logPage, setLogPage] = useState(1);
  const [logStatus, setLogStatus] = useState<string>('ALL');
  const [logPoint, setLogPoint] = useState<string>('ALL');
  const [logDirection, setLogDirection] = useState<string>('ALL');
  const [logSorting, setLogSorting] = useState<SortingState>([{ id: 'enteredAt', desc: true }]);

  const [assignPage, setAssignPage] = useState(1);
  const [assignStatus, setAssignStatus] = useState<string>('ALL');
  const [assignPoint, setAssignPoint] = useState<string>('ALL');
  const [assignSorting, setAssignSorting] = useState<SortingState>([{ id: 'grantedAt', desc: true }]);

  const [selectedLog, setSelectedLog] = useState<AccessControlLogItem | null>(null);
  const [logDetailOpen, setLogDetailOpen] = useState(false);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);

  const pageSize = 10;

  const logsQuery = useAccessLogsQuery(orgSlug, memberId, {
    page: logPage,
    pageSize,
    status: logStatus !== 'ALL' ? logStatus : undefined,
    accessPoint: logPoint !== 'ALL' ? logPoint : undefined,
    direction: logDirection !== 'ALL' ? logDirection : undefined,
  });

  const summaryQuery = useAccessLogSummaryQuery(orgSlug, memberId);

  const assignmentsQuery = useAccessAssignmentsQuery(orgSlug, memberId, {
    page: assignPage,
    pageSize,
    status: assignStatus !== 'ALL' ? assignStatus : undefined,
    accessPoint: assignPoint !== 'ALL' ? assignPoint : undefined,
  });

  const mutations = useAccessControlMutations(orgSlug, memberId);

  const logs = logsQuery.data?.items ?? [];
  const logsTotal = logsQuery.data?.total ?? 0;
  const logsPageCount = Math.max(1, Math.ceil(logsTotal / pageSize));

  const assignments = assignmentsQuery.data?.items ?? [];
  const assignmentsTotal = assignmentsQuery.data?.total ?? 0;
  const assignmentsPageCount = Math.max(1, Math.ceil(assignmentsTotal / pageSize));

  // ── Log columns ──────────────────────────────────────────────────────────

  const logColumns = useMemo(
    () => [
      {
        id: 'employeeName',
        header: 'Employee',
        accessorFn: (row: AccessControlLogItem) => row.employeeName ?? '',
        cell: ({ row: r }: { row: { original: AccessControlLogItem } }) => {
          const item = r.original;
          return (
            <div className="flex items-center gap-2">
              <User2 className="size-3.5 shrink-0 text-[#6e6e73]" />
              <span className="text-[13px] text-[#1d1d1f]">{item.employeeName || '—'}</span>
            </div>
          );
        },
        enableSorting: true,
      },
      {
        id: 'accessPoint',
        header: 'Access Point',
        accessorFn: (row: AccessControlLogItem) => row.accessPoint,
        cell: ({ getValue }: { getValue: () => string }) => (
          <div className="flex items-center gap-1.5">
            <DoorOpen className="size-3.5 text-[#6e6e73]" />
            <span className="text-[13px] text-[#1d1d1f]">{getValue()}</span>
          </div>
        ),
        enableSorting: true,
      },
      {
        id: 'entryMethod',
        header: 'Method',
        accessorFn: (row: AccessControlLogItem) => row.entryMethod,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="rounded-full bg-[#f4f8ff] px-2.5 py-0.5 text-[10px] font-medium text-[#2454a6]">
            {humanize(getValue())}
          </span>
        ),
        enableSorting: true,
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row: AccessControlLogItem) => row.status,
        cell: ({ getValue }: { getValue: () => string }) => {
          const val = getValue();
          const colors: Record<string, string> = {
            GRANTED: 'bg-[#f3fbf5] text-[#156f3d]',
            DENIED: 'bg-[#fff3f2] text-[#b3261e]',
            EXPIRED: 'bg-[#fff7e8] text-[#8a5a00]',
          };
          return (
            <span className={cn('rounded-full px-2.5 py-0.5 text-[10px] font-medium', colors[val] || 'bg-[#f3f4f6] text-[#6b7280]')}>
              {humanize(val)}
            </span>
          );
        },
        enableSorting: true,
      },
      {
        id: 'direction',
        header: 'Dir',
        accessorFn: (row: AccessControlLogItem) => row.direction,
        cell: ({ getValue }: { getValue: () => string }) => {
          const val = getValue();
          return val === 'IN' ? (
            <span className="text-[12px] font-medium text-[#156f3d]">IN</span>
          ) : (
            <span className="text-[12px] font-medium text-[#2454a6]">OUT</span>
          );
        },
        enableSorting: true,
      },
      {
        id: 'enteredAt',
        header: 'Time',
        accessorFn: (row: AccessControlLogItem) => row.enteredAt,
        cell: ({ getValue }: { getValue: () => string }) => (
          <div className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5 text-[#6e6e73]" />
            <span className="text-[12px] tabular-nums text-[#6e6e73]">{formatDate(getValue())}</span>
          </div>
        ),
        enableSorting: true,
      },
    ],
    [],
  );

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
              <User2 className="size-3.5 shrink-0 text-[#6e6e73]" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[#1d1d1f]">{item.employeeName || '—'}</p>
                <p className="truncate text-[11px] text-[#6e6e73]">{item.employeeEmail || ''}</p>
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
            <DoorOpen className="size-3.5 text-[#6e6e73]" />
            <span className="text-[13px] text-[#1d1d1f]">{getValue()}</span>
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
                    ? 'border-[#d1fae5] bg-[#f3fbf5] text-[#156f3d] hover:bg-[#e8f5ed]'
                    : 'border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280] hover:bg-[#f3f4f6]',
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
          <span className="text-[12px] text-[#6e6e73]">{getValue() || '—'}</span>
        ),
        enableSorting: true,
      },
      {
        id: 'grantedAt',
        header: 'Granted',
        accessorFn: (row: AccessControlAssignmentItem) => row.grantedAt,
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[12px] tabular-nums text-[#6e6e73]">{formatDate(getValue())}</span>
        ),
        enableSorting: true,
      },
    ],
    [mutations.toggleAssignment],
  );

  // ── Tables ───────────────────────────────────────────────────────────────

  const logTable = useReactTable({
    data: logs,
    columns: logColumns,
    state: { sorting: logSorting },
    onSortingChange: setLogSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: logsPageCount,
  });

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

  function LogFilters() {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-[#86868b]">Status</span>
          <Select value={logStatus} onValueChange={(v) => { setLogStatus(v); setLogPage(1); }}>
            <SelectTrigger className="h-8 w-[110px] rounded-lg border-[#e5e7eb] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-[12px]">All</SelectItem>
              {LOG_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-[12px]">{humanize(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-[#86868b]">Point</span>
          <Select value={logPoint} onValueChange={(v) => { setLogPoint(v); setLogPage(1); }}>
            <SelectTrigger className="h-8 w-[120px] rounded-lg border-[#e5e7eb] text-[12px]">
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
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-[#86868b]">Direction</span>
          <Select value={logDirection} onValueChange={(v) => { setLogDirection(v); setLogPage(1); }}>
            <SelectTrigger className="h-8 w-[100px] rounded-lg border-[#e5e7eb] text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-[12px]">All</SelectItem>
              {DIRECTIONS.map((d) => (
                <SelectItem key={d} value={d} className="text-[12px]">{d === 'IN' ? 'Entry' : 'Exit'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  function AssignFilters() {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-[#86868b]">Status</span>
          <Select value={assignStatus} onValueChange={(v) => { setAssignStatus(v); setAssignPage(1); }}>
            <SelectTrigger className="h-8 w-[110px] rounded-lg border-[#e5e7eb] text-[12px]">
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
          <span className="text-[11px] font-medium text-[#86868b]">Point</span>
          <Select value={assignPoint} onValueChange={(v) => { setAssignPoint(v); setAssignPage(1); }}>
            <SelectTrigger className="h-8 w-[120px] rounded-lg border-[#e5e7eb] text-[12px]">
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

  // ── Pagination ───────────────────────────────────────────────────────────

  function PaginationBar({
    page,
    pageCount,
    onPageChange,
  }: {
    page: number;
    pageCount: number;
    onPageChange: (p: number) => void;
  }) {
    if (pageCount <= 1) return null;
    return (
      <div className="mt-3 flex items-center justify-between border-t border-[#f0f0f2] px-0 pt-3">
        <span className="text-[12px] text-[#86868b] tabular-nums">
          Page {page} of {pageCount}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="h-7 rounded-lg border-[#e5e7eb] px-2.5 text-[12px] font-normal"
          >
            Prev
          </Button>
          {Array.from({ length: Math.min(pageCount, 7) }).map((_, i) => {
            const p = i + 1;
            return (
              <Button
                key={p}
                variant={page === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(p)}
                className={`h-7 min-w-7 rounded-lg px-1 text-[12px] ${
                  page === p
                    ? 'bg-[#1d1d1f] text-white'
                    : 'border-[#e5e7eb] text-[#6e6e73]'
                }`}
              >
                {p}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            className="h-7 rounded-lg border-[#e5e7eb] px-2.5 text-[12px] font-normal"
          >
            Next
          </Button>
        </div>
      </div>
    );
  }

  // ── Summary Cards ────────────────────────────────────────────────────────

  const summary = summaryQuery.data;

  const summaryCards = [
    {
      label: 'Entries Today',
      value: summary?.totalEntriesToday ?? 0,
      icon: DoorOpen,
      color: 'text-[#2454a6] bg-[#f4f8ff]',
    },
    {
      label: 'Granted',
      value: summary?.grantedToday ?? 0,
      icon: ShieldCheck,
      color: 'text-[#156f3d] bg-[#f3fbf5]',
    },
    {
      label: 'Denied',
      value: summary?.deniedToday ?? 0,
      icon: ShieldX,
      color: 'text-[#b3261e] bg-[#fff3f2]',
    },
    {
      label: 'Active Assign.',
      value: summary?.activeAssignments ?? 0,
      icon: UserCheck,
      color: 'text-[#156f3d] bg-[#f3fbf5]',
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full">
      <div className="mb-5">
        <h2 className="text-[18px] font-semibold text-[#111827]">Access Control</h2>
        <p className="mt-0.5 text-[13px] text-[#6b7280]">
          Monitor door entries and manage employee access permissions
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="rounded-[16px] border border-[#e5e7eb] bg-white px-4 py-3.5 shadow-[0_1px_0_rgba(17,24,39,0.03)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#6b7280]">{card.label}</span>
              <div className={cn('flex size-7 items-center justify-center rounded-lg', card.color)}>
                <card.icon className="size-3.5" />
              </div>
            </div>
            <p className="mt-1 text-[22px] font-semibold tracking-tight text-[#111827]">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="mb-4 inline-flex items-center rounded-xl border border-black/4 bg-neutral-50 p-1">
        <button
          type="button"
          onClick={() => setSubTab('logs')}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
            subTab === 'logs'
              ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
              : 'text-neutral-500 hover:text-neutral-900',
          )}
        >
          <Fingerprint className="size-3.5" />
          Access Logs
        </button>
        <button
          type="button"
          onClick={() => setSubTab('assignments')}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
            subTab === 'assignments'
              ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
              : 'text-neutral-500 hover:text-neutral-900',
          )}
        >
          <ShieldCheck className="size-3.5" />
          Assignments
        </button>
      </div>

      {/* ── Access Logs Tab ──────────────────────────────────────────────── */}
      {subTab === 'logs' && (
        <>
          <LogFilters />

          {logsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-[#f3f4f6]" />
              ))}
            </div>
          ) : logsQuery.isError ? (
            <div className="flex items-center justify-center rounded-[18px] border border-[#e5e7eb] bg-white px-6 py-14 text-center">
              <div>
                <AlertTriangle className="mx-auto size-6 text-[#9ca3af]" />
                <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">Failed to load access logs</p>
                <p className="mt-0.5 text-[13px] text-[#6e6e73]">Try refreshing the page</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex items-center justify-center rounded-[18px] border border-[#e5e7eb] bg-white px-6 py-14 text-center">
              <div>
                <Fingerprint className="mx-auto size-6 text-[#9ca3af]" />
                <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">No access logs yet</p>
                <p className="mt-0.5 text-[13px] text-[#6e6e73]">Entries will appear here when employees use door access points</p>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_1px_0_rgba(17,24,39,0.03)]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {logTable.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((header) => {
                          const canSort = header.column.getCanSort();
                          return (
                            <TableHead
                              key={header.id}
                              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]"
                            >
                              {header.isPlaceholder ? null : (
                                <button
                                  type="button"
                                  className={`flex items-center gap-1 ${canSort ? 'cursor-pointer select-none' : ''}`}
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {canSort && (
                                    <span className="flex flex-col">
                                      <ChevronUp className={`size-3 -mb-1 ${header.column.getIsSorted() === 'asc' ? 'text-[#1d1d1f]' : 'text-[#d2d2d7]'}`} />
                                      <ChevronDown className={`size-3 ${header.column.getIsSorted() === 'desc' ? 'text-[#1d1d1f]' : 'text-[#d2d2d7]'}`} />
                                    </span>
                                  )}
                                </button>
                              )}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {logTable.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="cursor-pointer border-b border-[#f0f0f2] transition-colors hover:bg-[#fafafa]"
                        onClick={() => {
                          setSelectedLog(row.original);
                          setLogDetailOpen(true);
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationBar page={logPage} pageCount={logsPageCount} onPageChange={setLogPage} />
            </div>
          )}

          <AccessLogDetailDialog
            item={selectedLog}
            open={logDetailOpen}
            onOpenChange={setLogDetailOpen}
          />
        </>
      )}

      {/* ── Assignments Tab ───────────────────────────────────────────────── */}
      {subTab === 'assignments' && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <AssignFilters />
            <Button
              onClick={() => setGrantDialogOpen(true)}
              className="h-8 rounded-lg bg-[#1d1d1f] px-4 text-[12px] font-medium text-white hover:bg-[#333]"
            >
              <UserCheck className="mr-1.5 size-3.5" />
              Grant Access
            </Button>
          </div>

          {assignmentsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-[#f3f4f6]" />
              ))}
            </div>
          ) : assignmentsQuery.isError ? (
            <div className="flex items-center justify-center rounded-[18px] border border-[#e5e7eb] bg-white px-6 py-14 text-center">
              <div>
                <AlertTriangle className="mx-auto size-6 text-[#9ca3af]" />
                <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">Failed to load assignments</p>
                <p className="mt-0.5 text-[13px] text-[#6e6e73]">Try refreshing the page</p>
              </div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="flex items-center justify-center rounded-[18px] border border-[#e5e7eb] bg-white px-6 py-14 text-center">
              <div>
                <ShieldCheck className="mx-auto size-6 text-[#9ca3af]" />
                <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">No access assignments yet</p>
                <p className="mt-0.5 text-[13px] text-[#6e6e73]">Grant access to employees to manage door permissions</p>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_1px_0_rgba(17,24,39,0.03)]">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {assignTable.getHeaderGroups().map((hg) => (
                      <TableRow key={hg.id}>
                        {hg.headers.map((header) => {
                          const canSort = header.column.getCanSort();
                          return (
                            <TableHead
                              key={header.id}
                              className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#86868b]"
                            >
                              {header.isPlaceholder ? null : (
                                <button
                                  type="button"
                                  className={`flex items-center gap-1 ${canSort ? 'cursor-pointer select-none' : ''}`}
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  {flexRender(header.column.columnDef.header, header.getContext())}
                                  {canSort && (
                                    <span className="flex flex-col">
                                      <ChevronUp className={`size-3 -mb-1 ${header.column.getIsSorted() === 'asc' ? 'text-[#1d1d1f]' : 'text-[#d2d2d7]'}`} />
                                      <ChevronDown className={`size-3 ${header.column.getIsSorted() === 'desc' ? 'text-[#1d1d1f]' : 'text-[#d2d2d7]'}`} />
                                    </span>
                                  )}
                                </button>
                              )}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {assignTable.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="border-b border-[#f0f0f2] transition-colors hover:bg-[#fafafa]"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationBar page={assignPage} pageCount={assignmentsPageCount} onPageChange={setAssignPage} />
            </div>
          )}

          <GrantAccessDialog
            open={grantDialogOpen}
            onOpenChange={setGrantDialogOpen}
            orgSlug={orgSlug}
            memberId={memberId}
          />
        </>
      )}
    </div>
  );
}
