'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Column definitions ───────────────────────────────────────────────────────

// Column width distribution (must sum to 100%)
// Employee 35% | Email 20% | Role 20% | Attendance 25%
const COL_WIDTHS = ['25%', '25%', '25%', '25%'];

const SKELETON_COUNT = 20;
const SKELETON_IDS = Array.from({ length: SKELETON_COUNT }, (_, i) => `skeleton-row-${i}`);

const columns: ColumnDef<EmployeeListItem>[] = [
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
          <div className="min-w-0 flex flex-col items-start">
            <p className="truncate text-sm font-medium text-neutral-900" title={name}>
              {name}
            </p>
            <p className="truncate text-[11px] text-neutral-500" title={email}>
              {email}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    id: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <span
        className="block truncate text-sm text-neutral-700"
        title={row.original.email}
      >
        {row.original.email}
      </span>
    ),
  },
  {
    id: 'role',
    header: 'Role',
    cell: ({ row }) =>
      row.original.role ? (
        <span
          className="block truncate text-sm text-neutral-700"
          title={row.original.role.name}
        >
          {row.original.role.name}
        </span>
      ) : (
        <span className="text-neutral-400">—</span>
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

// No longer using ColGroup or table-specific columns for widths.

interface TableBodyProps {
  isLoading: boolean;
  rows: Row<EmployeeListItem>[];
  pageSize: number;
}

function TableBody({ isLoading, rows, pageSize }: Readonly<TableBodyProps>) {
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
          {/* Column 1: Name (fixed width for vertical alignment) */}
          <div className="w-[260px] shrink-0 flex justify-start">
            {flexRender(row.getVisibleCells()[0].column.columnDef.cell, row.getVisibleCells()[0].getContext())}
          </div>
          
          {/* Column 2: Email */}
          <div className="w-[240px] shrink-0 flex justify-start">
            {flexRender(row.getVisibleCells()[1].column.columnDef.cell, row.getVisibleCells()[1].getContext())}
          </div>
          
          {/* Column 3: Role */}
          <div className="w-[140px] shrink-0 flex justify-start">
            {flexRender(row.getVisibleCells()[2].column.columnDef.cell, row.getVisibleCells()[2].getContext())}
          </div>
          
          {/* Column 4: Attendance (right aligned) */}
          <div className="w-[160px] shrink-0 flex justify-end">
            {flexRender(row.getVisibleCells()[3].column.columnDef.cell, row.getVisibleCells()[3].getContext())}
          </div>
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
}: Readonly<EmployeeTableProps>) {
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
            <div className="w-[260px] shrink-0 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-left">Name</div>
            <div className="w-[240px] shrink-0 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-left">Email</div>
            <div className="w-[140px] shrink-0 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-left">Role</div>
            <div className="w-[160px] shrink-0 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-right">Today's Attendance</div>
          </div>

          <div className="px-4">
            <TableBody
              isLoading={isLoading}
              rows={table.getRowModel().rows}
              pageSize={pageSize}
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
