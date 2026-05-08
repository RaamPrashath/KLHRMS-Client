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
const COL_WIDTHS = ['35%', '20%', '20%', '25%'];

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
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-900" title={name}>
              {name}
            </p>
            <p className="truncate text-xs text-neutral-500" title={email}>
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

// ─── ColGroup ─────────────────────────────────────────────────────────────────

function ColGroup() {
  return (
    <colgroup>
      {COL_WIDTHS.map((w) => (
        <col key={w} style={{ width: w }} />
      ))}
    </colgroup>
  );
}

// ─── TableBody sub-component ──────────────────────────────────────────────────

interface TableBodyProps {
  isLoading: boolean;
  rows: Row<EmployeeListItem>[];
  pageSize: number;
  columnCount: number;
}

function TableBody({ isLoading, rows, pageSize, columnCount }: Readonly<TableBodyProps>) {
  if (isLoading) {
    return (
      <tbody className="divide-y divide-black/4 bg-white">
        {SKELETON_IDS.slice(0, pageSize).map((id) => (
          <tr key={id} className="border-b border-black/4">
            <td colSpan={columnCount} className="p-4 lg:px-6">
              <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
            </td>
          </tr>
        ))}
      </tbody>
    );
  }

  if (rows.length === 0) {
    return (
      <tbody className="bg-white">
        <tr>
          <td
            colSpan={columnCount}
            className="px-6 py-16 text-center text-sm text-neutral-400"
          >
            No employees found.
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody className="divide-y divide-black/4 bg-white">
      {rows.map((row) => (
        <tr
          key={row.id}
          className="border-b border-black/4 transition-colors hover:bg-canvas/60"
        >
          {row.getVisibleCells().map((cell) => (
            <td key={cell.id} className="max-w-0 overflow-hidden px-6 py-3.5">
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
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
    <div className="flex flex-col gap-6">
      {/* ── Card shell ─────────────────────────────────────────────────────── */}
      <div className="bg-surface rounded-xl border border-black/3 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">

        {/* ── Layer 1: Top actions (filters) ──────────────────────────── */}
        <div className="p-4 border-b border-neutral-100 bg-surface flex flex-col gap-4">
          {/* Filters row */}
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

        {/* ── Layer 2: Table header ───────────────────────────────────────── */}
        {/* ── Layer 3: Table body ─────────────────────────────────────────── */}
        <div className="overflow-x-auto w-full bg-white">
          <table className="w-full table-fixed border-collapse min-w-[700px]">
            <ColGroup />

            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-black/4 bg-canvas">
                  {hg.headers.map((h) => (
                    <th
                      key={h.id}
                      className="px-6 py-3 text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider text-left"
                    >
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <TableBody
              isLoading={isLoading}
              rows={table.getRowModel().rows}
              pageSize={pageSize}
              columnCount={columns.length}
            />
          </table>
        </div>

        {/* ── Pagination (inside card, below body) ────────────────────────── */}
        {!isLoading && total > 0 && (
          <div className="border-t border-black/4 bg-surface px-4 py-3">
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
