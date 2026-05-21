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
import { ProjectsFilters } from './ProjectsFilters';
import { ProjectsPagination } from './ProjectsPagination';
import type { ProjectSummary, ProjectStatus } from '@/modules/projects/types/projectTypes';

interface ProjectsTableProps {
  data: ProjectSummary[];
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  search: string;
  statusFilter: ProjectStatus | 'ALL';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: ProjectStatus | 'ALL') => void;
  onClearAll: () => void;
  onRowClick: (project: ProjectSummary) => void;
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-[#eef9f1] text-[#156f3d]',
  ON_HOLD: 'bg-[#fff7e8] text-[#8a5a00]',
  COMPLETED: 'bg-[#eef5ff] text-[#2454a6]',
  CANCELLED: 'bg-[#fff0f0] text-[#a12323]',
};

const SKELETON_COUNT = 20;
const SKELETON_IDS = Array.from({ length: SKELETON_COUNT }, (_, i) => `skeleton-row-${i}`);

const columns: ColumnDef<ProjectSummary>[] = [
  {
    id: 'project',
    header: 'Project',
    cell: ({ row }) => (
      <span className="block truncate text-sm font-medium text-neutral-900" title={row.original.name}>
        {row.original.name}
      </span>
    ),
  },
  {
    id: 'client',
    header: 'Client',
    cell: ({ row }) => (
      <span className="block truncate text-sm text-neutral-700">
        {row.original.clientName || 'Internal'}
      </span>
    ),
  },
  {
    id: 'team',
    header: 'Team',
    cell: ({ row }) => (
      <span className="block truncate text-sm text-neutral-700">
        {row.original.teamName || 'Not linked'}
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
    id: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge className={cn('rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase', STATUS_STYLES[row.original.status])}>
        {row.original.status.replaceAll('_', ' ')}
      </Badge>
    ),
  },
];

interface TableBodyProps {
  isLoading: boolean;
  rows: Row<ProjectSummary>[];
  pageSize: number;
  onRowClick: (project: ProjectSummary) => void;
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
        No projects found.
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-surface">
      {rows.map((row) => {
        const project = row.original;
        return (
          <div
            key={row.id}
            onClick={() => onRowClick(project)}
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

export function ProjectsTable({
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
}: Readonly<ProjectsTableProps>) {
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
          <ProjectsFilters
            search={search}
            statusFilter={statusFilter}
            onSearchChange={onSearchChange}
            onStatusChange={onStatusChange}
            onClearAll={onClearAll}
          />
        </div>

        <div className="w-full">
          <div className="flex justify-around items-center border-b border-black/[0.04] bg-canvas/50 py-3 px-8">
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Project</div>
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Client</div>
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">Team</div>
            <div className="flex-1 text-center text-[12.5px] font-semibold text-neutral-500 uppercase tracking-wider">People</div>
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
            <ProjectsPagination
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
