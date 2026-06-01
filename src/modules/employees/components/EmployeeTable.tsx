'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { useMemo } from 'react';
import { Pencil, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AttendanceBadge } from './AttendanceBadge';
import { EmployeeFilters } from './EmployeeFilters';
import { EmployeePagination } from './EmployeePagination';
import type {
  EmployeeListItem,
  EmployeeFilterOption,
  AttendanceTodayStatus,
} from '@/modules/employees/types/employeeTypes';

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmployeeTableProps {
  // data
  data: EmployeeListItem[];
  isLoading: boolean;
  total: number;
  // pagination
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  // filters
  search: string;
  roleId: string | undefined;
  attendanceStatus: AttendanceTodayStatus | undefined;
  roles: EmployeeFilterOption[];
  onSearchChange: (value: string) => void;
  onRoleChange: (value: string | undefined) => void;
  onAttendanceStatusChange: (value: AttendanceTodayStatus | undefined) => void;
  onClearAll: () => void;
  // role editing
  canEditRole?: boolean;
  onEditRole?: (memberId: string, currentRoleName: string | null) => void;
  // deactivation
  onDeactivate?: (memberId: string, name: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function colWidth(id: string): string {
  const map: Record<string, string> = {
    employee: 'w-[240px]',
    email: 'w-[200px]',
    role: 'w-[170px]',
    source: 'w-[120px]',
    attendance: 'w-[150px]',
    actions: 'w-[100px]',
  };
  return map[id] ?? 'w-[120px]';
}

function colAlign(id: string): string {
  return id === 'attendance' || id === 'actions' ? 'justify-end' : 'justify-start';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Column definitions ───────────────────────────────────────────────────────

const SKELETON_COUNT = 20;
const SKELETON_IDS = Array.from({ length: SKELETON_COUNT }, (_, i) => `skeleton-row-${i}`);

function buildColumns(
  canEditRole: boolean,
  onEditRole?: (memberId: string, currentRoleName: string | null) => void,
  onDeactivate?: (memberId: string, name: string) => void,
): ColumnDef<EmployeeListItem>[] {
  const cols: ColumnDef<EmployeeListItem>[] = [
    {
      id: 'employee',
      header: 'Name',
      cell: ({ row }) => {
        const { name, email, image } = row.original;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={image ?? undefined} alt={name} />
              <AvatarFallback className="bg-primary-subtle text-xs font-medium text-primary">
                {getInitials(name)}
              </AvatarFallback>
            </Avatar>
            <p className="min-w-0 truncate text-sm font-medium text-neutral-900" title={name}>
              {name}
            </p>
          </div>
        );
      },
    },
    {
      id: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="block truncate text-sm text-neutral-700" title={row.original.email}>
          {row.original.email}
        </span>
      ),
    },
    {
      id: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.role ? (
            <span className="truncate text-sm text-neutral-700" title={row.original.role.name}>
              {row.original.role.name}
            </span>
          ) : (
            <span className="text-neutral-400">—</span>
          )}
          {canEditRole && onEditRole && (
            <button
              type="button"
              onClick={() => onEditRole(row.original.member_id, row.original.role?.name ?? null)}
              className="shrink-0 rounded p-0.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              title="Change role"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
        </div>
      ),
    },
    {
      id: 'source',
      header: 'Source',
      cell: ({ row }) => (
        row.original.microsoft_synced ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-200">
            <svg className="size-3" viewBox="0 0 21 21" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Microsoft
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-500">
            Manual
          </span>
        )
      ),
    },
    {
      id: 'attendance',
      header: "Today's Attendance",
      cell: ({ row }) => (
        <AttendanceBadge status={row.original.attendance_today.status} />
      ),
    },
  ];

  if (onDeactivate) {
    cols.push({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onDeactivate(row.original.member_id, row.original.name)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-red-600 hover:bg-red-50 transition-colors"
          title="Deactivate employee"
        >
          <UserX className="size-3.5" />
          Deactivate
        </button>
      ),
    });
  }

  return cols;
}

interface TableBodyProps {
  isLoading: boolean;
  rows: Row<EmployeeListItem>[];
  pageSize: number;
  canEditRole: boolean;
}

function TableBody({ isLoading, rows, pageSize, canEditRole }: Readonly<TableBodyProps>) {
  if (isLoading) {
    return (
      <div className="flex flex-col divide-y divide-black/4 bg-surface">
        {SKELETON_IDS.slice(0, pageSize).map((id) => (
          <div key={id} className="border-b border-black/4 p-6">
            <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="bg-surface py-16 text-center text-sm text-neutral-400">
        No employees found.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-black/4 bg-surface">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex justify-around items-center border-b border-black/4 transition-colors hover:bg-black/[0.02] py-3 px-4"
        >
          {row.getVisibleCells().map((cell) => (
            <div
              key={cell.id}
              className={cn(colWidth(cell.column.id), 'shrink-0 flex', colAlign(cell.column.id))}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EmployeeTable({
  data,
  isLoading,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  search,
  roleId,
  attendanceStatus,
  roles,
  onSearchChange,
  onRoleChange,
  onAttendanceStatusChange,
  onClearAll,
  canEditRole = false,
  onEditRole,
  onDeactivate,
}: Readonly<EmployeeTableProps>) {
  const columns = useMemo(() => buildColumns(canEditRole, onEditRole, onDeactivate), [canEditRole, onEditRole, onDeactivate]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  return (
    <div className="flex flex-col flex-1 mx-7 mb-7">
      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
        {/* ── Layer 1: Top actions (filters) ──────────────────────────── */}
        <div className="px-8 py-6 flex flex-col gap-4 border-b border-black/[0.04]">
          <EmployeeFilters
            search={search}
            roleId={roleId}
            attendanceStatus={attendanceStatus}
            roles={roles}
            onSearchChange={onSearchChange}
            onRoleChange={onRoleChange}
            onAttendanceStatusChange={onAttendanceStatusChange}
            onClearAll={onClearAll}
          />
        </div>

        {/* ── Layer 2 & 3: Table (Flex) ─────────────────────────────────────────── */}
        <div className="w-full">
          {/* Header Row */}
          <div className="flex justify-around items-center border-b border-black/[0.04] bg-canvas/50 py-3 px-8">
            {table.getHeaderGroups().map((hg) =>
              hg.headers.map((header) => (
                <div
                  key={header.id}
                  className={cn(
                    colWidth(header.id),
                    'shrink-0 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider',
                    colAlign(header.id) === 'justify-end' ? 'text-right' : 'text-left',
                  )}
                >
                  {header.isPlaceholder ? '' : flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              )),
            )}
          </div>

          <div className="px-4">
            <TableBody
              isLoading={isLoading}
              rows={table.getRowModel().rows}
              pageSize={pageSize}
              canEditRole={canEditRole}
            />
          </div>
        </div>

        {/* ── Pagination (below body) ────────────────────────── */}
        {!isLoading && total > 0 && (
          <div className="px-8 py-6 mt-auto border-t border-black/[0.04] bg-surface">
            <EmployeePagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
