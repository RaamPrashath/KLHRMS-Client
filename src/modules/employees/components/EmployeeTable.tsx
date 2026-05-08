'use client';

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AttendanceBadge } from './AttendanceBadge';
import type { EmployeeListItem } from '@/modules/employees/types/employeeTypes';

interface EmployeeTableProps {
  data: EmployeeListItem[];
  isLoading: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

// Column width distribution (must sum to 100%)
// Employee 35% | Email 25% | Role 20% | Attendance 20%
const COL_WIDTHS = ['35%', '25%', '20%', '20%'];

const HEADERS = ['Employee', 'Email', 'Role', "Today's Attendance"];

const columns: ColumnDef<EmployeeListItem>[] = [
  {
    id: 'employee',
    header: 'Employee',
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
          {/* min-w-0 is required here so flexbox allows the child to shrink below its content size */}
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

// Shared classes for th/td so skeleton and real table stay in sync
const thClass =
  'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500';
const tdClass = 'max-w-0 overflow-hidden px-4 py-3';

function ColGroup() {
  return (
    <colgroup>
      {COL_WIDTHS.map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    </colgroup>
  );
}

export function EmployeeTable({ data, isLoading }: EmployeeTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-neutral-100 bg-surface shadow-(--shadow-1)">
        <table className="w-full table-fixed">
          <ColGroup />
          <thead>
            <tr className="border-b border-neutral-200 bg-canvas">
              {HEADERS.map((h) => (
                <th key={h} className={thClass}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-neutral-100">
                {Array.from({ length: 4 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-surface-muted" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-100 bg-surface shadow-(--shadow-1)">
      {/* overflow-x-auto only kicks in on very narrow viewports; table-fixed prevents blowout */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <ColGroup />
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-neutral-200 bg-canvas">
                {hg.headers.map((h) => (
                  <th key={h.id} className={thClass}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-neutral-400"
                >
                  No employees found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-neutral-100 bg-surface transition-colors hover:bg-canvas"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className={tdClass}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
