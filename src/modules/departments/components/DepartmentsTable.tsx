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
import {
  Table,
  TableBody as ShadcnTableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
    ? 'bg-primary/[0.08] text-primary border border-primary/10'
    : 'bg-neutral-100 text-neutral-500 border border-neutral-200';
}

const SKELETON_COUNT = 20;
const SKELETON_IDS = Array.from({ length: SKELETON_COUNT }, (_, i) => `skeleton-row-${i}`);

function colWidth(id: string): string {
  const map: Record<string, string> = {
    department: 'w-[34%]',
    lead: 'w-[26%]',
    people: 'w-[14%]',
    projects: 'w-[14%]',
    status: 'w-[14%]',
    actions: 'w-[6%]',
  };
  return map[id] ?? 'w-[10%]';
}

function colAlign(id: string): string {
  return id === 'department' || id === 'lead' ? 'justify-start' : 'justify-center';
}

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

interface DepartmentsTableBodyProps {
  isLoading: boolean;
  rows: Row<DepartmentSummary>[];
  pageSize: number;
  columnCount: number;
  onRowClick: (department: DepartmentSummary) => void;
}

function DepartmentsTableBody({
  isLoading,
  rows,
  pageSize,
  columnCount,
  onRowClick,
}: Readonly<DepartmentsTableBodyProps>) {
  if (isLoading) {
    return (
      <ShadcnTableBody className="bg-surface">
        {SKELETON_IDS.slice(0, pageSize).map((id) => (
          <TableRow key={id} className="border-black/4 hover:bg-transparent">
            <TableCell colSpan={columnCount} className="p-6">
              <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
            </TableCell>
          </TableRow>
        ))}
      </ShadcnTableBody>
    );
  }

  if (rows.length === 0) {
    return (
      <ShadcnTableBody className="bg-surface">
        <TableRow className="border-black/4 hover:bg-transparent">
          <TableCell colSpan={columnCount} className="py-16 text-center text-sm text-neutral-400">
            No departments found.
          </TableCell>
        </TableRow>
      </ShadcnTableBody>
    );
  }

  return (
    <ShadcnTableBody className="bg-surface">
      {rows.map((row) => {
        const dept = row.original;
        return (
          <TableRow
            key={row.id}
            onClick={() => onRowClick(dept)}
            className="cursor-pointer border-black/4 transition-colors hover:bg-black/[0.02]"
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={cn(
                  colWidth(cell.column.id),
                  'px-3 py-3 whitespace-nowrap',
                  cell.column.id === 'department' || cell.column.id === 'lead' ? 'text-left' : 'text-center',
                )}
              >
                <div className={cn('flex', colAlign(cell.column.id))}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              </TableCell>
            ))}

            <TableCell className="w-[6%] px-3 py-3 text-right">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRowClick(dept);
                  }}
                  className="h-9 rounded-lg px-3 text-neutral-700 hover:bg-black/5"
                >
                  <ChevronRight className="size-4 opacity-50" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        );
      })}
    </ShadcnTableBody>
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

  const columnCount = table.getAllLeafColumns().length + 1;

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
          <div className="px-4">
            <Table className="table-fixed">
              <TableHeader className="bg-canvas/50">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-black/[0.04] hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          colWidth(header.id),
                          'h-auto px-3 py-3 whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-wider text-neutral-500',
                          header.id === 'department' || header.id === 'lead' ? 'text-left' : 'text-center',
                        )}
                      >
                        {header.isPlaceholder
                          ? ''
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                    <TableHead className="w-[6%] px-3 py-3" />
                  </TableRow>
                ))}
              </TableHeader>

              <DepartmentsTableBody
                isLoading={isLoading}
                rows={table.getRowModel().rows}
                pageSize={pageSize}
                columnCount={columnCount}
                onRowClick={onRowClick}
              />
            </Table>
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
