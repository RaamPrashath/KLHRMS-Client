'use client';

import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody as ShadcnTableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { PipelineJobPosting } from '@/modules/candidates/types/atsTypes';

function formatPriority(value: string | null) {
  if (!value) return 'Unspecified';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getPriorityClasses(priority: string | null) {
  if (priority === 'LOW') return 'border-neutral-200 bg-neutral-100 text-neutral-500';
  if (priority === 'HIGH') return 'border-warning-border bg-warning-bg text-warning-text';
  if (priority === 'CRITICAL') return 'border-destructive-border bg-destructive-bg text-destructive-text';
  if (priority === 'MEDIUM') return 'border-info-border bg-info-bg text-info-text';
  return 'border-neutral-200 bg-neutral-50 text-neutral-500';
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const SKELETON_COUNT = 10;

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

function colWidth(id: string): string {
  const map: Record<string, string> = {
    role: 'w-[20%]',
    candidates: 'w-[20%]',
    stages: 'w-[20%]',
    priority: 'w-[20%]',
    openings: 'w-[20%]',
  };
  return map[id] ?? 'w-[20%]';
}

function colCellPadding(id: string): string {
  if (id === 'role') return 'pl-6 pr-3';
  return 'px-3';
}

function colHeadPadding(id: string): string {
  if (id === 'role') return 'pl-6 pr-3';
  return 'px-3';
}

export function CandidatesLandingTable({
  orgSlug,
  postings,
}: Readonly<{
  orgSlug: string;
  postings: PipelineJobPosting[];
}>) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredData = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return postings;
    return postings.filter((posting) =>
      [posting.title, posting.priority ?? '', posting.openings?.toString() ?? '', posting.stageCount.toString(), posting.candidateCount.toString()]
        .join(' ')
        .toLowerCase()
        .includes(value),
    );
  }, [search, postings]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const columns = useMemo<ColumnDef<PipelineJobPosting>[]>(
    () => [
      {
        id: 'role',
        header: 'Role Name',
        cell: ({ row }) => (
          <span className="block truncate text-sm font-medium text-neutral-900" title={row.original.title}>
            {row.original.title}
          </span>
        ),
      },
      {
        id: 'candidates',
        header: 'Total Candidates',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-neutral-700">{row.original.candidateCount}</span>
        ),
      },
      {
        id: 'stages',
        header: 'Total Stages',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-neutral-700">{row.original.stageCount}</span>
        ),
      },
      {
        id: 'priority',
        header: 'Priority',
        cell: ({ row }) => (
          <Badge
            className={cn(
              'rounded-md px-2.5 py-1 text-xs font-semibold',
              getPriorityClasses(row.original.priority),
            )}
          >
            {formatPriority(row.original.priority)}
          </Badge>
        ),
      },
      {
        id: 'openings',
        header: 'Openings',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-neutral-700">{row.original.openings ?? '—'}</span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: paginatedData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const columnCount = table.getAllLeafColumns().length;

  return (
    <div className="flex flex-col flex-1 mx-7 mb-7">
      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
        {/* ── Filters ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 border-b border-black/[0.04] px-3.5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="Search roles..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-9 border-0 bg-canvas px-3 pl-9 text-sm focus:border focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/10"
              />
            </div>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────── */}
        <div className="w-full">
          <div>
            <Table className="table-fixed">
              <TableHeader className="bg-canvas/50">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-black/[0.04] hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          colWidth(header.id),
                          colHeadPadding(header.id),
                          'h-auto py-3 whitespace-nowrap text-[12.5px] font-semibold tracking-wider uppercase text-neutral-500',
                          header.id === 'role' ? 'text-left' : 'text-center',
                        )}
                      >
                        {header.isPlaceholder
                          ? ''
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>

              <ShadcnTableBody className="bg-surface">
                {paginatedData.length === 0 ? (
                  <TableRow className="border-black/4 hover:bg-transparent">
                    <TableCell colSpan={columnCount} className="py-16 text-center text-sm text-neutral-400">
                      {search ? 'No roles match your search.' : 'No job openings are available yet.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={() => router.push(`/${orgSlug}/candidates/${row.original.slug}`)}
                      className="cursor-pointer border-black/4 transition-colors hover:bg-black/[0.02]"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            colWidth(cell.column.id),
                            colCellPadding(cell.column.id),
                            'py-3 whitespace-nowrap',
                            cell.column.id === 'role' ? 'text-left' : 'text-center',
                          )}
                        >
                          <div
                            className={cn(
                              'flex',
                              cell.column.id === 'role' ? 'justify-start' : 'justify-center',
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </ShadcnTableBody>
            </Table>
          </div>
        </div>

        {/* ── Pagination ───────────────────────────────────────────── */}
        {filteredData.length > 0 && (
          <div className="px-8 py-6 mt-auto border-t border-black/[0.04] bg-surface">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-neutral-500">Show</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
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
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-200 bg-surface text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="size-4" />
                </button>

                {buildPageNumbers(page, totalPages).map((p, idx) =>
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
                      onClick={() => setPage(p as number)}
                      className={`inline-flex size-8 items-center justify-center rounded-md text-[13px] font-medium transition-colors ${
                        p === page
                          ? 'bg-primary text-white'
                          : 'border border-neutral-200 bg-surface text-neutral-700 hover:bg-neutral-50'
                      }`}
                      aria-current={p === page ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  ),
                )}

                <button
                  type="button"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
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
    </div>
  );
}
