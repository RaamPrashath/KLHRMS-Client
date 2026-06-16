'use client';

import { useMemo, useState, useCallback, useTransition } from 'react';
import { FileSpreadsheet, FileText, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableBody as ShadcnTableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { exportRecruitmentReportAction } from '@/modules/candidates/api/atsServerActions';
import { useRecruitmentReportJobs } from '@/modules/candidates/hooks/useAtsPipeline';
import type { RecruitmentReportFormat, RecruitmentReportJob } from '@/modules/candidates/types/atsTypes';

const ALL = 'all';
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const STATUSES = ['ACTIVE', 'CLOSED'] as const;
const EMPTY_JOBS: RecruitmentReportJob[] = [];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
const SKELETON_COUNT = 10;

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function label(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function StatusBadge({ status }: { readonly status: RecruitmentReportJob['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
        status === 'ACTIVE'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-rose-200 bg-rose-50 text-rose-700',
      )}
    >
      {label(status)}
    </span>
  );
}

function PriorityBadge({ priority }: { readonly priority: RecruitmentReportJob['priority'] }) {
  const tones: Record<string, string> = {
    LOW: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    MEDIUM: 'border-blue-200 bg-blue-50 text-blue-700',
    HIGH: 'border-amber-200 bg-amber-50 text-amber-700',
    CRITICAL: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  const tone = tones[priority] ?? 'border-neutral-200 bg-neutral-50 text-neutral-700';

  return (
    <span className={cn('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium', tone)}>
      {label(priority)}
    </span>
  );
}

const btnBase =
  'inline-flex h-9 items-center justify-center rounded-lg border px-3 text-sm font-medium bg-white transition-all duration-200 hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed';

const btnColors: Record<string, string> = {
  pdf: 'border-red-200 text-red-600 hover:border-red-300',
  xlsx: 'border-green-200 text-green-600 hover:border-green-300',
  csv: 'border-blue-200 text-blue-600 hover:border-blue-300',
};

interface RecruitmentReportPageShellProps {
  orgSlug: string;
  memberId: string;
}

function colWidth(id: string): string {
  const map: Record<string, string> = {
    select: 'w-[5%]',
    name: 'w-[25%]',
    totalCandidates: 'w-[25%]',
    priority: 'w-[22.5%]',
    status: 'w-[22.5%]',
  };
  return map[id] ?? '';
}

function colAlign(id: string): string {
  return id === 'name' ? 'justify-start' : 'justify-center';
}

function colCellPadding(id: string): string {
  if (id === 'select') return 'pl-4 pr-2';
  if (id === 'name') return 'pl-3 pr-3';
  return 'px-3';
}

function colHeadPadding(id: string): string {
  if (id === 'select') return 'pl-4 pr-2';
  if (id === 'name') return 'pl-3 pr-3';
  return 'px-3';
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | '...')[] = [];

  pages.push(1);

  if (current > 4) {
    pages.push('...');
  }

  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 3) {
    pages.push('...');
  }

  pages.push(total);

  return pages;
}

export function RecruitmentReportPageShell({
  orgSlug,
  memberId,
}: Readonly<RecruitmentReportPageShellProps>) {
  const [, startTransition] = useTransition();
  const reportQuery = useRecruitmentReportJobs(orgSlug, memberId);

  // ── Filters ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);

  // ── Pagination ───────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // ── Selection ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // ── Export ───────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState<RecruitmentReportFormat | null>(null);

  // ── Derived data ─────────────────────────────────────────────────────
  const jobs = reportQuery.data?.items ?? EMPTY_JOBS;

  const filteredJobs = useMemo(
    () =>
      jobs.filter((job) => {
        const priorityMatch = priorityFilter === ALL || job.priority === priorityFilter;
        const statusMatch = statusFilter === ALL || job.status === statusFilter;
        const searchMatch = !search.trim() || job.name.toLowerCase().includes(search.toLowerCase());
        return priorityMatch && statusMatch && searchMatch;
      }),
    [jobs, priorityFilter, statusFilter, search],
  );

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / pageSize));
  const paginatedJobs = useMemo(
    () => filteredJobs.slice((page - 1) * pageSize, page * pageSize),
    [filteredJobs, page, pageSize],
  );

  const visibleIds = useMemo(() => paginatedJobs.map((job) => job.id), [paginatedJobs]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds[id]);
  const someVisibleSelected = visibleIds.some((id) => selectedIds[id]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => {
      setSearch(value);
      setPage(1);
    });
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    startTransition(() => setPage(newPage));
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    startTransition(() => {
      setPageSize(newSize);
      setPage(1);
    });
  }, []);

  const toggleAllVisible = useCallback((value: boolean) => {
    setSelectedIds((current) => {
      const next = { ...current };
      for (const id of visibleIds) next[id] = value;
      return next;
    });
  }, [visibleIds]);

  const exportIds = useMemo(() => {
    const selectedVisibleIds = filteredJobs.filter((job) => selectedIds[job.id]).map((job) => job.id);
    return selectedVisibleIds.length > 0 ? selectedVisibleIds : filteredJobs.map((job) => job.id);
  }, [filteredJobs, selectedIds]);

  async function exportReport(format: RecruitmentReportFormat) {
    if (exportIds.length === 0) {
      toast.error('No job openings match the current filters.');
      return;
    }
    try {
      setExporting(format);
      const blob = await exportRecruitmentReportAction({
        orgSlug,
        memberId,
        format,
        jobPostingIds: exportIds,
        includeCandidateHistory: false,
      });
      triggerDownload(blob, `recruitment-report.${format}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export recruitment report');
    } finally {
      setExporting(null);
    }
  }

  // ── Columns ──────────────────────────────────────────────────────────
  const columns: ColumnDef<RecruitmentReportJob>[] = useMemo(
    () => [
      {
        id: 'select',
        header: () => (
          <div className="flex justify-center">
            <Checkbox
              checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
              onCheckedChange={(value) => toggleAllVisible(Boolean(value))}
              aria-label="Select all visible job openings"
            />
          </div>
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={Boolean(selectedIds[row.original.id])}
            onCheckedChange={(value) =>
              setSelectedIds((current) => ({ ...current, [row.original.id]: Boolean(value) }))
            }
            aria-label={`Select ${row.original.name}`}
          />
        ),
        enableSorting: false,
      },
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) => (
          <span className="block truncate text-sm font-medium text-neutral-900" title={row.original.name}>
            {row.original.name}
          </span>
        ),
      },
      {
        id: 'totalCandidates',
        header: 'Total Candidates',
        cell: ({ row }) => (
          <span className="font-mono text-sm text-neutral-700">{row.original.totalCandidates}</span>
        ),
      },
      {
        id: 'priority',
        header: 'Priority',
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    [allVisibleSelected, someVisibleSelected, selectedIds, toggleAllVisible],
  );

  const table = useReactTable({
    data: paginatedJobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const columnCount = table.getAllLeafColumns().length;

  // ── Error state ──────────────────────────────────────────────────────
  if (reportQuery.isError) {
    let message = 'Failed to load recruitment report.';
    try {
      const parsed = JSON.parse(reportQuery.error?.message ?? '{}');
      if (parsed.message) message = parsed.message;
    } catch {
      // ignore parse errors
    }
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-100 bg-surface p-8">
        <p className="text-sm text-destructive-text">{message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 flex-1 bg-canvas min-h-full">
      {/* ── Heading ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between ml-7 mt-7 mr-7">
        <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">Recruitment Report</h1>
      </div>

      {/* ── Table Container ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 mx-7 mb-7">
        <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col">
          {/* ── Filters & Export ─────────────────────────────────────── */}
          <div className="flex flex-col gap-2 border-b border-black/[0.04] px-3.5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400 " />
                <Input
                  placeholder="Search Jobs"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-9 border-0 bg-canvas px-3 pl-9 text-sm focus:border focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/10"
                />
              </div>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-9 w-[130px] bg-canvas border-0 text-sm focus:border focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/10">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All priority</SelectItem>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>{label(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[130px] bg-canvas border-0 text-sm focus:border focus:border-primary focus:bg-surface focus:ring-[3px] focus:ring-primary/10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All status</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{label(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="mx-1 h-6 w-px bg-neutral-200" />

              <button
                type="button"
                onClick={() => exportReport('pdf')}
                disabled={Boolean(exporting)}
                className={cn(btnBase, btnColors.pdf)}
              >
                {exporting === 'pdf' ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <FileText className="mr-1.5 size-3.5" />}
                PDF
              </button>
              <button
                type="button"
                onClick={() => exportReport('xlsx')}
                disabled={Boolean(exporting)}
                className={cn(btnBase, btnColors.xlsx)}
              >
                {exporting === 'xlsx' ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <FileSpreadsheet className="mr-1.5 size-3.5" />}
                Excel
              </button>
              <button
                type="button"
                onClick={() => exportReport('csv')}
                disabled={Boolean(exporting)}
                className={cn(btnBase, btnColors.csv)}
              >
                {exporting === 'csv' ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <FileSpreadsheet className="mr-1.5 size-3.5" />}
                CSV
              </button>
            </div>
          </div>

          {/* ── Table ────────────────────────────────────────────────── */}
          <div className="w-full">
            <div>
              <Table className="table-fixed">
                <TableHeader className="bg-neutral-50">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id} className="border-black/[0.04] hover:bg-transparent">
                      {hg.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={cn(
                            colWidth(header.id),
                            colHeadPadding(header.id),
                            'h-auto py-3 whitespace-nowrap text-[12.5px] font-semibold tracking-wider uppercase text-neutral-500',
                            header.id === 'name' ? 'text-left' : 'text-center',
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

                {reportQuery.isLoading ? (
                  <ShadcnTableBody className="bg-surface">
                    {Array.from({ length: SKELETON_COUNT }, (_, i) => i).slice(0, pageSize).map((id) => (
                      <TableRow key={`skeleton-${id}`} className="border-black/4 hover:bg-transparent">
                        <TableCell colSpan={columnCount} className="p-6">
                          <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-100" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </ShadcnTableBody>
                ) : paginatedJobs.length === 0 ? (
                  <ShadcnTableBody className="bg-surface">
                    <TableRow className="border-black/4 hover:bg-transparent">
                      <TableCell colSpan={columnCount} className="py-16 text-center text-sm text-neutral-400">
                        No Jobs Found.
                      </TableCell>
                    </TableRow>
                  </ShadcnTableBody>
                ) : (
                  <ShadcnTableBody className="bg-surface">
                    {table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="border-black/4 transition-colors hover:bg-black/[0.02]"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              colWidth(cell.column.id),
                              colCellPadding(cell.column.id),
                              'py-3 whitespace-nowrap',
                              cell.column.id === 'name' ? 'text-left' : 'text-center',
                            )}
                          >
                            <div className={cn('flex', colAlign(cell.column.id))}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </ShadcnTableBody>
                )}
              </Table>
            </div>
          </div>

          {/* ── Pagination ───────────────────────────────────────────── */}
          {!reportQuery.isLoading && filteredJobs.length > 0 && (
            <div className="px-8 py-6 mt-auto border-t border-black/[0.04] bg-surface">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-neutral-500">Show</span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => handlePageSizeChange(Number(v))}
                    >
                      <SelectTrigger className="h-8 w-[72px] text-xs" size='sm'>
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
                    onClick={() => handlePageChange(page - 1)}
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
                        onClick={() => handlePageChange(p as number)}
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
                    onClick={() => handlePageChange(page + 1)}
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
    </div>
  );
}
