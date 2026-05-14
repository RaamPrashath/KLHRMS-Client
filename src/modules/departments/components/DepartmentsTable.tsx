'use client';

import { ChevronRight } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type Row,
} from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DepartmentsFilters } from './DepartmentsFilters';
import { DepartmentsPagination } from './DepartmentsPagination';
import type { DepartmentSummary, DepartmentStatus } from '@/modules/departments/types/departmentTypes';

interface DepartmentsTableProps {
  data: DepartmentSummary[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  statusFilter: DepartmentStatus | 'ALL';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: DepartmentStatus | 'ALL') => void;
  onClearAll: () => void;
  onRowClick: (department: DepartmentSummary) => void;
}

function formatStatus(status: DepartmentStatus) {
  return status === 'ACTIVE'
    ? 'bg-[#00874A]/[0.08] text-[#00874A] border border-[#00874A]/10'
    : 'bg-neutral-100 text-neutral-500 border border-neutral-200';
}

const SKELETON_COUNT = 20;
const SKELETON_IDS = Array.from({ length: SKELETON_COUNT }, (_, i) => `skeleton-row-${i}`);

const columns: ColumnDef<DepartmentSummary>[] = [
  {
    id: 'department',
    header: 'Department',
    cell: ({ row }) => (
      <span className="block truncate text-sm font-medium text-neutral-900" title={row.original.name}>
        {row.original.name}
      </span>
    ),
  },
  {
    id: 'lead',
    header: 'Lead',
    cell: ({ row }) => (
      <span className="block truncate text-sm text-neutral-700">
        {row.original.headMemberName || 'Not assigned'}
      </span>
    ),
  },
  {
    id: 'teams',
    header: 'Teams',
    cell: ({ row }) => (
      <span className="text-sm font-medium text-neutral-900">
        {row.original.teamCount}
      </span>
    ),
  },
  {
    id: 'people',
    header: 'People',
    cell: ({ row }) => (
      <span className="text-sm font-medium text-neutral-900">
        {row.original.memberCount}
      </span>
    ),
  },
  {
    id: 'projects',
    header: 'Projects',
    cell: ({ row }) => (
      <span className="text-sm font-medium text-neutral-900">
        {row.original.projectCount}
      </span>
    ),
  },
  {
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge className={cn('rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase', formatStatus(row.original.status))}>
        {row.original.status}
      </Badge>
    ),
  },
];

interface TableBodyProps {
  isLoading: boolean;
  rows: Row<DepartmentSummary>[];
  pageSize: number;
  onRowClick: (department: DepartmentSummary) => void;
}

function TableBody({ isLoading, rows, pageSize, onRowClick }: Readonly<TableBodyProps>) {
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
        No departments found.
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-surface">
      {rows.map((row) => {
        const dept = row.original;
        return (
          <div
            key={row.id}
            onClick={() => onRowClick(dept)}
            className="flex justify-around items-center border-b border-black/4 transition-colors hover:bg-black/[0.02] py-3 px-4 cursor-pointer"
          >
            <div className="flex-1 flex justify-center">
              {flexRender(row.getVisibleCells()[0].column.columnDef.cell, row.getVisibleCells()[0].getContext())}
            </div>

            <div className="flex-1 flex justify-center">
              {flexRender(row.getVisibleCells()[1].column.columnDef.cell, row.getVisibleCells()[1].getContext())}
            </div>

            <div className="flex-1 flex justify-center">
              {flexRender(row.getVisibleCells()[2].column.columnDef.cell, row.getVisibleCells()[2].getContext())}
            </div>

            <div className="flex-1 flex justify-center">
              {flexRender(row.getVisibleCells()[3].column.columnDef.cell, row.getVisibleCells()[3].getContext())}
            </div>

            <div className="flex-1 flex justify-center">
              {flexRender(row.getVisibleCells()[4].column.columnDef.cell, row.getVisibleCells()[4].getContext())}
            </div>

            <div className="flex-1 flex justify-center">
              {flexRender(row.getVisibleCells()[5].column.columnDef.cell, row.getVisibleCells()[5].getContext())}
            </div>

            <div className="w-10 shrink-0 flex justify-end">
              <Button variant="ghost" className="h-9 px-3 text-neutral-700 hover:bg-black/5 rounded-xl">
                <ChevronRight className="size-4 opacity-50" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DepartmentsTable({
  data,
  isLoading,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
  search,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onClearAll,
  onRowClick,
}: Readonly<DepartmentsTableProps>) {
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
        <div className="px-8 py-6 flex flex-col gap-4 border-b border-black/[0.04]">
          <DepartmentsFilters
            search={search}
            statusFilter={statusFilter}
            onSearchChange={onSearchChange}
            onStatusChange={onStatusChange}
            onClearAll={onClearAll}
          />
        </div>

        <div className="w-full">
          <div className="flex justify-around items-center border-b border-black/[0.04] bg-canvas/50 py-3 px-8">
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Department</div>
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Lead</div>
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Teams</div>
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">People</div>
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Projects</div>
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Status</div>
            <div className="w-10 shrink-0" />
          </div>

          <div className="px-4">
            <TableBody
              isLoading={isLoading}
              rows={table.getRowModel().rows}
              pageSize={pageSize}
              onRowClick={onRowClick}
            />
          </div>
        </div>

        {!isLoading && total > 0 && (
          <div className="px-8 py-6 mt-auto border-t border-black/[0.04] bg-surface">
            <DepartmentsPagination
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
