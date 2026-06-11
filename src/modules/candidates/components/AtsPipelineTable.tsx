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
  Loader2,
  ShieldAlert,
  Sparkles,
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
  stageOrder: number;
  appliedDate: string;
  lastMovedAt: string | null;
  status: string;
  aiScore: number | null;
  aiAnalysisStatus: string | null;
  aiEvaluationStatus: string | null;
  isFlaggedForCheating: boolean;
  isInterviewOngoing: boolean;
  displayStatus: 'Scheduled' | 'Ongoing' | 'Completed' | null;
  application: PipelineApplication;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | '...')[] = [];
  pages.push(1);
  if (current > 4) pages.push('...');
  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 3) pages.push('...');
  pages.push(total);
  return pages;
}

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
      const meeting = application.interviewMeeting;
      const displayStatus: PipelineTableRow['displayStatus'] =
        meeting?.status === 'PENDING'
          ? 'Scheduled'
          : meeting?.status === 'ONGOING'
            ? 'Ongoing'
            : meeting?.status === 'COMPLETED'
              ? 'Completed'
              : null;

      return {
        id: application.id,
        candidateId: application.candidate.id,
        name,
        email: application.candidate.email,
        phone: application.candidate.phone,
        source: application.source,
        currentStage: stage.name,
        pipelineStageId: stage.id,
        stageOrder: stage.order,
        appliedDate: application.appliedDate,
        lastMovedAt: application.lastMovedAt,
        status: application.status,
        aiScore: application.aiScore,
        aiAnalysisStatus: application.aiAnalysisStatus,
        aiEvaluationStatus: application.aiEvaluationStatus,
        isFlaggedForCheating: application.isFlaggedForCheating,
        isInterviewOngoing: meeting?.status === 'ONGOING',
        displayStatus,
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
      className="-ml-2 h-8 px-2 text-[12.5px] font-semibold tracking-wider text-neutral-500 hover:text-neutral-900"
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

  const rows = useMemo(() => {
    const built = buildRows(stages);
    built.sort((a, b) => b.stageOrder - a.stageOrder);
    return built;
  }, [stages]);
  const rowIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);
  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  useEffect(() => {
    setRowSelection((current) =>
      Object.fromEntries(Object.entries(current).filter(([id, selected]) => selected && rowIds.has(id))),
    );
  }, [rowIds]);

  async function moveSelected() {
    const rawIds = Object.entries(rowSelection)
      .filter(([, selected]) => selected)
      .map(([id]) => id);

    if (!targetStageId || targetStageId === 'all' || rawIds.length === 0) return;

    // Safety net: filter out any ongoing-interview rows that may have been selected
    const selectedIds = rawIds.filter((id) => {
      const row = rows.find((r) => r.id === id);
      return row && !row.isInterviewOngoing;
    });

    if (selectedIds.length === 0) {
      toast.error('None of the selected candidates can be moved because they have ongoing interviews');
      return;
    }

    if (selectedIds.length !== rawIds.length) {
      toast.warning('Skipped candidates with ongoing interviews');
    }

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
            disabled={row.original.isInterviewOngoing}
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
        accessorKey: 'currentStage',
        header: ({ column }) => (
          <SortButton label="Current Stage" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />
        ),
        cell: ({ row }) => (
          <span className="inline-flex rounded-full bg-info-bg px-2 py-0.5 text-xs font-medium text-info-text">
            {row.original.currentStage}
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
      {
        id: 'aiScore',
        header: ({ column }) => (
          <SortButton label="AI Score" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />
        ),
        sortingFn: (rowA, rowB) => (rowA.original.aiScore ?? -1) - (rowB.original.aiScore ?? -1),
        cell: ({ row }) => (
          <div className="flex flex-wrap items-center gap-1.5">
            {row.original.aiScore !== null ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-primary-ghost px-2 py-0.5 font-mono text-xs font-medium text-primary">
                {row.original.aiScore}
              </span>
            ) : row.original.aiAnalysisStatus ? (
              <span className="rounded-full bg-info-bg px-2 py-0.5 text-xs font-medium text-info-text">
                {row.original.aiAnalysisStatus === 'FAILED' ? 'Failed' : 'Analyzing'}
              </span>
            ) : (
              <span className="text-sm text-neutral-400">—</span>
            )}
            {(row.original.aiScore ?? 0) >= 70 && row.original.aiEvaluationStatus === 'QUALIFIED' ? (
              <Sparkles className="size-3.5 text-success-text" />
            ) : null}
            {row.original.isFlaggedForCheating ? (
              <ShieldAlert className="size-3.5 text-warning-text" />
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'lastMovedAt',
        header: ({ column }) => (
          <SortButton label="Last Moved" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-[13px] text-neutral-700">
            {row.original.lastMovedAt ? formatDate(row.original.lastMovedAt) : '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: ({ column }) => (
          <SortButton label="Status" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')} />
        ),
        sortingFn: (rowA, rowB) => {
          const order: Record<string, number> = { Scheduled: 0, Ongoing: 1, Completed: 2 };
          const a = order[rowA.original.displayStatus ?? ''] ?? -1;
          const b = order[rowB.original.displayStatus ?? ''] ?? -1;
          return a - b;
        },
        cell: ({ row }) => {
          const status = row.original.displayStatus;
          if (!status) {
            return <span className="text-sm text-neutral-400">—</span>;
          }
          const styles: Record<string, string> = {
            Scheduled: 'bg-warning-bg text-warning-text',
            Ongoing: 'bg-yellow-100 text-yellow-800',
            Completed: 'bg-success-bg text-success-text',
          };
          return (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
            >
              {status === 'Ongoing' && (
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-yellow-500/40" />
                  <span className="relative inline-flex size-2 rounded-full bg-yellow-500" />
                </span>
              )}
              {status}
            </span>
          );
        },
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
    enableRowSelection: (row) => !row.original.isInterviewOngoing,
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
        row.original.lastMovedAt,
        row.original.displayStatus,
        row.original.aiScore,
        row.original.aiAnalysisStatus,
        row.original.isFlaggedForCheating ? 'flagged suspicious hidden text' : null,
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

  const pageNum = table.getState().pagination.pageIndex + 1;
  const pageCount = table.getPageCount() || 1;

  return (
    <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
      <div className="flex flex-col gap-3 border-b border-black/[0.04] px-3.5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={(table.getColumn('currentStage')?.getFilterValue() as string | undefined) ?? 'all'}
            onValueChange={(value) =>
              table.getColumn('currentStage')?.setFilterValue(value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="h-9 w-[180px] border-0 bg-canvas text-sm focus:border focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/10">
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
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <span className="text-sm font-medium text-neutral-700">{selectedCount} selected</span>
          <Select value={targetStageId || 'all'} onValueChange={setTargetStageId}>
            <SelectTrigger className="h-9 w-full border-0 bg-canvas text-sm focus:border focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/10 sm:w-[190px]">
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
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
            disabled={selectedCount === 0 || !targetStageId || targetStageId === 'all' || isMoving}
            onClick={moveSelected}
          >
            {isMoving ? <Loader2 className="size-4 animate-spin" /> : null}
            Move selected
          </Button>
        </div>
      </div>

      <div className="w-full">
        <div>
          <Table className="table-fixed">
            <TableHeader className="bg-canvas/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-black/[0.04] hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'h-auto py-3 px-4 whitespace-nowrap text-[12.5px] font-semibold tracking-wider text-neutral-500',
                        header.column.id !== 'select' && header.column.id !== 'name' && 'text-center',
                      )}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="bg-surface">
              {pageRows.length > 0 ? (
                pageRows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                    className={cn(
                      'cursor-pointer border-black/4 transition-colors hover:bg-black/[0.02]',
                      row.getIsSelected() && 'bg-primary-ghost',
                    )}
                    onClick={() => onOpenCandidate(row.original.id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'py-3 px-4 whitespace-nowrap',
                          cell.column.id !== 'select' && cell.column.id !== 'name' && 'text-center',
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-black/4 hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="py-16 text-center text-sm text-neutral-400">
                    No candidates match the current search and filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {filteredCount > 0 && (
        <div className="px-8 py-6 mt-auto border-t border-black/[0.04] bg-surface">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-neutral-500">Show</span>
                <Select
                  value={String(table.getState().pagination.pageSize)}
                  onValueChange={(value) => table.setPageSize(Number(value))}
                >
                  <SelectTrigger className="h-8 w-[72px] text-xs" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)} className="text-xs">
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[13px] text-neutral-500">Per Page</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-surface text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous Page"
              >
                <ChevronLeft className="size-4" />
              </button>

              {buildPageNumbers(pageNum, pageCount).map((p, idx) =>
                p === '...' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="inline-flex size-8 items-center justify-center text-[13px] text-neutral-400"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => table.setPageIndex((p as number) - 1)}
                    className={`inline-flex size-8 items-center justify-center rounded-md text-[13px] font-medium transition-colors ${
                      p === pageNum
                        ? 'bg-primary text-white'
                        : 'border border-neutral-200 bg-surface text-neutral-700 hover:bg-neutral-50'
                    }`}
                    aria-current={p === pageNum ? 'page' : undefined}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-surface text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next Page"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
