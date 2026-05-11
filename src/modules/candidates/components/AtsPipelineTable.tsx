'use client';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { PipelineApplication, PipelineStage } from '@/modules/candidates/types/atsTypes';

interface AtsPipelineTableProps {
  readonly stages: PipelineStage[];
  readonly globalSearch: string;
  readonly isMoving: boolean;
  readonly onOpenCandidate: (applicationId: string) => void;
  readonly onMoveSelected: (applicationIds: string[], stageId: string) => Promise<void>;
}

interface PipelineTableRow {
  id: string;
  candidateId: string;
  name: string;
  email: string;
  phone: string | null;
  source: string;
  currentStage: string;
  pipelineStageId: string;
  score: number | null;
  appliedDate: string;
  application: PipelineApplication;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function buildRows(stages: PipelineStage[]): PipelineTableRow[] {
  return stages.flatMap((stage) =>
    stage.applications.map((application) => {
      const name = `${application.candidate.firstName} ${application.candidate.lastName}`.trim();

      return {
        id: application.id,
        candidateId: application.candidate.id,
        name,
        email: application.candidate.email,
        phone: application.candidate.phone,
        source: application.source,
        currentStage: stage.name,
        pipelineStageId: stage.id,
        score: application.score,
        appliedDate: application.appliedDate,
        application,
      };
    }),
  );
}

function SortButton({
  label,
  onClick,
}: {
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 h-8 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900"
      onClick={onClick}
    >
      {label}
      <ArrowUpDown className="size-3.5" />
    </Button>
  );
}

export function AtsPipelineTable({
  stages,
  globalSearch,
  isMoving,
  onOpenCandidate,
  onMoveSelected,
}: AtsPipelineTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [targetStageId, setTargetStageId] = useState<string>('');

  const rows = useMemo(() => buildRows(stages), [stages]);
  const rowIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);
  const sources = useMemo(
    () => Array.from(new Set(rows.map((row) => row.source).filter(Boolean))).sort(),
    [rows],
  );
  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  useEffect(() => {
    setRowSelection((current) =>
      Object.fromEntries(Object.entries(current).filter(([id, selected]) => selected && rowIds.has(id))),
    );
  }, [rowIds]);

  async function moveSelected() {
    const selectedIds = Object.entries(rowSelection)
      .filter(([, selected]) => selected)
      .map(([id]) => id);

    if (!targetStageId || selectedIds.length === 0) return;

    try {
      await onMoveSelected(selectedIds, targetStageId);
      setRowSelection({});
      setTargetStageId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to move selected candidates');
    }
  }

  const columns = useMemo<ColumnDef<PipelineTableRow>[]>(
    () => [
      {
        id: 'select',
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all visible candidates"
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? 'indeterminate'
                  : false
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Select ${row.original.name}`}
            checked={row.getIsSelected()}
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          />
        ),
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <SortButton label="Candidate" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />
        ),
        cell: ({ row }) => (
          <div className="flex min-w-[240px] items-center gap-3">
            <Avatar className="size-9 border border-neutral-100">
              <AvatarFallback className="bg-primary-ghost text-xs font-semibold text-primary">
                {getInitials(row.original.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900">{row.original.name}</p>
              <p className="truncate text-xs text-neutral-500">{row.original.email}</p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'source',
        header: ({ column }) => (
          <SortButton label="Source" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />
        ),
        cell: ({ row }) => (
          <span className="inline-flex rounded-full bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-700">
            {row.original.source}
          </span>
        ),
      },
      {
        accessorKey: 'currentStage',
        header: ({ column }) => (
          <SortButton label="Stage" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />
        ),
        cell: ({ row }) => (
          <span className="inline-flex rounded-full bg-info-bg px-2 py-0.5 text-xs font-medium text-info-text">
            {row.original.currentStage}
          </span>
        ),
      },
      {
        accessorKey: 'score',
        header: ({ column }) => (
          <SortButton label="Score" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-[13px] text-neutral-700">
            {row.original.score ?? '-'}
          </span>
        ),
      },
      {
        accessorKey: 'appliedDate',
        header: ({ column }) => (
          <SortButton label="Applied" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-[13px] text-neutral-700">
            {formatDate(row.original.appliedDate)}
          </span>
        ),
      },
    ],
    [],
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.id,
    state: {
      sorting,
      columnFilters,
      globalFilter: globalSearch,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = normalize(filterValue);
      if (!query) return true;

      return [
        row.original.name,
        row.original.email,
        row.original.phone,
        row.original.source,
        row.original.currentStage,
        row.original.score,
      ].some((value) => normalize(value).includes(query));
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [columnFilters, globalSearch, table]);

  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageRows = table.getRowModel().rows;

  return (
    <div className="rounded-xl border border-neutral-100 bg-surface shadow-[var(--shadow-1)]">
      <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={(table.getColumn('currentStage')?.getFilterValue() as string | undefined) ?? 'all'}
            onValueChange={(value) =>
              table.getColumn('currentStage')?.setFilterValue(value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="h-9 w-[180px] bg-surface">
              <SelectValue placeholder="Filter stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.name}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={(table.getColumn('source')?.getFilterValue() as string | undefined) ?? 'all'}
            onValueChange={(value) =>
              table.getColumn('source')?.setFilterValue(value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="h-9 w-[190px] bg-surface">
              <SelectValue placeholder="Filter source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((source) => (
                <SelectItem key={source} value={source}>
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <span className="text-sm font-medium text-neutral-700">{selectedCount} selected</span>
          <Select value={targetStageId || undefined} onValueChange={setTargetStageId}>
            <SelectTrigger className="h-9 w-full bg-surface sm:w-[190px]">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            disabled={selectedCount === 0 || !targetStageId || isMoving}
            onClick={moveSelected}
          >
            {isMoving ? <Loader2 className="size-4 animate-spin" /> : null}
            Move selected
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-canvas hover:bg-canvas">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="px-4 py-2.5">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {pageRows.length > 0 ? (
            pageRows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() ? 'selected' : undefined}
                className={cn(
                  'cursor-pointer border-neutral-100 hover:bg-canvas',
                  row.getIsSelected() && 'bg-primary-ghost',
                )}
                onClick={() => onOpenCandidate(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-28 text-center text-sm text-neutral-500">
                No candidates match the current search and filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col gap-3 border-t border-neutral-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-neutral-500">
          Showing {pageRows.length} of {filteredCount} candidates
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-9 w-[140px] bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-neutral-500">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="First page"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Last page"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
