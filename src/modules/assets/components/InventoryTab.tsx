'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { AlertTriangle, LaptopMinimal, PackageOpen, Search } from 'lucide-react';
import { ExportBand } from '@/modules/assets/components/ExportBand';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  useBrandModelAnalyticsQuery,
  useOsDistributionQuery,
  useWarrantyFeedQuery,
} from '@/modules/assets/hooks/useDashboardQuery';
import { formatDate, humanize } from '@/modules/assets/lib/assetUtils';
import type { BrandModelInventoryRow, OsDistributionRow, WarrantyExpirationFeedItem } from '@/modules/assets/components/dashboard/dashboard.types';

type SubTab = 'brand-model' | 'os-distribution' | 'expirations';

const PAGE_SIZE = 10;

// ── Brand & Model Table ──────────────────────────────────────────────────────

function BrandModelTable({ orgSlug, memberId }: { orgSlug: string; memberId: string }) {
  const { data, isLoading, isError } = useBrandModelAnalyticsQuery(orgSlug, memberId);
  const rows = data?.rows ?? [];
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.brand.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const columns = useMemo(
    () => [
      {
        id: 'brand',
        header: 'Brand',
        accessorKey: 'brand',
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] font-semibold text-slate-900 dark:text-white">{getValue()}</span>
        ),
      },
      {
        id: 'model',
        header: 'Model',
        accessorKey: 'model',
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] text-slate-550 dark:text-slate-400 font-medium">{getValue()}</span>
        ),
      },
      {
        id: 'totalStock',
        header: 'Total Stock',
        accessorKey: 'totalStock',
        cell: ({ getValue }: { getValue: () => number }) => (
          <span className="text-[13px] font-semibold tabular-nums text-slate-800 dark:text-slate-300">{getValue()}</span>
        ),
      },
      {
        id: 'inOfficeStock',
        header: 'In Office',
        accessorKey: 'inOfficeStock',
        cell: ({ row: r }: { row: { original: BrandModelInventoryRow } }) => {
          const v = r.original.inOfficeStock;
          return (
            <span className={cn('text-[13px] font-semibold tabular-nums', v === 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-300')}>
              {v}
            </span>
          );
        },
      },
      {
        id: 'providedStock',
        header: 'Provided',
        accessorKey: 'providedStock',
        cell: ({ getValue }: { getValue: () => number }) => (
          <span className="text-[13px] font-semibold tabular-nums text-slate-800 dark:text-slate-300">{getValue()}</span>
        ),
      },
      {
        id: 'maintenanceOrDamagedStock',
        header: 'Maint.',
        accessorKey: 'maintenanceOrDamagedStock',
        cell: ({ getValue }: { getValue: () => number }) => (
          <span className="text-[13px] font-semibold tabular-nums text-slate-800 dark:text-slate-300">{getValue()}</span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { pagination: { pageIndex, pageSize: PAGE_SIZE } },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const next = updater({ pageIndex, pageSize: PAGE_SIZE });
        setPageIndex(next.pageIndex);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    pageCount,
  });

  const paginationPages = useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }
    const pages: (number | 'ellipsis')[] = [0];
    if (pageIndex > 2) pages.push('ellipsis');
    const start = Math.max(1, pageIndex - 1);
    const end = Math.min(pageCount - 2, pageIndex + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (pageIndex < pageCount - 3) pages.push('ellipsis');
    pages.push(pageCount - 1);
    return pages;
  }, [pageIndex, pageCount]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60 border border-border" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] px-6 py-14 text-center">
        <div>
          <AlertTriangle className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-[14px] font-semibold text-foreground">Failed to load brand & model data</p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] px-6 py-14 text-center">
        <div>
          <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-[#f9fafb] dark:bg-slate-900/50">
            <PackageOpen className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-[15px] font-semibold text-foreground">No brand & model data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
      {/* Search Header inside container */}
      <div className="px-8 py-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search brand or model..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageIndex(0);
              }}
              className="pl-9 bg-muted/30 border border-border focus:bg-background text-sm h-9 rounded-xl focus:ring-1 focus:ring-primary focus-visible:ring-1"
            />
          </div>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="flex items-center justify-center bg-card px-6 py-14 text-center">
          <div>
            <PackageOpen className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-[14px] font-semibold text-foreground">No matching inventory records</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Try a different search query</p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-b border-border bg-slate-50/50 dark:bg-slate-900/10 hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} className="h-11 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="border-b border-border hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-6 py-3.5 text-slate-705 dark:text-slate-350 align-middle font-medium">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 bg-slate-50/30 dark:bg-slate-900/10 border-t border-border text-xs text-muted-foreground flex justify-between items-center shrink-0">
            <span className="font-semibold text-muted-foreground">
              Showing {pageIndex * PAGE_SIZE + 1}-{Math.min((pageIndex + 1) * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} entries
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageIndex(pageIndex - 1)}
                disabled={pageIndex === 0}
                className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
              >
                Previous
              </Button>
              {paginationPages.map((p, idx) =>
                p === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="flex size-7 items-center justify-center text-[12px] text-muted-foreground">
                    &hellip;
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={pageIndex === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPageIndex(p)}
                    className={cn(
                      'h-7 min-w-7 rounded-lg px-1 text-[11px] font-semibold',
                      pageIndex === p
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border-border text-muted-foreground bg-card hover:bg-muted',
                    )}
                  >
                    {p + 1}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageIndex(pageIndex + 1)}
                disabled={pageIndex >= pageCount - 1}
                className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── OS Distribution Table ────────────────────────────────────────────────────

function OsDistributionTable({ orgSlug, memberId }: { orgSlug: string; memberId: string }) {
  const { data, isLoading, isError } = useOsDistributionQuery(orgSlug, memberId);
  const rows = data?.rows ?? [];
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => r.osName.toLowerCase().includes(q));
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const columns = useMemo(
    () => [
      {
        id: 'osName',
        header: 'OS',
        accessorKey: 'osName',
        cell: ({ getValue }: { getValue: () => string }) => {
          const os = getValue();
          const dotColor: Record<string, string> = {
            macOS: 'bg-slate-500',
            Windows: 'bg-blue-500',
            Linux: 'bg-amber-500',
            Ubuntu: 'bg-orange-500',
          };
          return (
            <div className="flex items-center gap-2">
              <span className={cn('size-2 rounded-full shrink-0', dotColor[os] || 'bg-slate-400')} />
              <span className="text-[13px] font-semibold text-slate-900 dark:text-white">{os}</span>
            </div>
          );
        },
      },
      {
        id: 'headcount',
        header: 'Users',
        accessorKey: 'headcount',
        cell: ({ getValue }: { getValue: () => number }) => (
          <span className="text-[13px] font-semibold tabular-nums text-slate-800 dark:text-slate-300">{getValue()}</span>
        ),
      },
      {
        id: 'percentage',
        header: 'Share',
        accessorKey: 'percentage',
        cell: ({ getValue }: { getValue: () => number }) => {
          const pct = Math.round(getValue());
          return (
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[12px] tabular-nums text-muted-foreground font-semibold">{pct}%</span>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { pagination: { pageIndex, pageSize: PAGE_SIZE } },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const next = updater({ pageIndex, pageSize: PAGE_SIZE });
        setPageIndex(next.pageIndex);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    pageCount,
  });

  const paginationPages = useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }
    const pages: (number | 'ellipsis')[] = [0];
    if (pageIndex > 2) pages.push('ellipsis');
    const start = Math.max(1, pageIndex - 1);
    const end = Math.min(pageCount - 2, pageIndex + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (pageIndex < pageCount - 3) pages.push('ellipsis');
    pages.push(pageCount - 1);
    return pages;
  }, [pageIndex, pageCount]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60 border border-border" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] px-6 py-14 text-center">
        <div>
          <AlertTriangle className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-[14px] font-semibold text-foreground">Failed to load OS distribution</p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] px-6 py-14 text-center">
        <div>
          <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-[#f9fafb] dark:bg-slate-900/50">
            <LaptopMinimal className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-[15px] font-semibold text-foreground">No OS distribution data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
      {/* Search Header inside container */}
      <div className="px-8 py-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search OS..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageIndex(0);
              }}
              className="pl-9 bg-muted/30 border border-border focus:bg-background text-sm h-9 rounded-xl focus:ring-1 focus:ring-primary focus-visible:ring-1"
            />
          </div>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="flex items-center justify-center bg-card px-6 py-14 text-center">
          <div>
            <LaptopMinimal className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-[14px] font-semibold text-foreground">No matching OS distribution records</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Try a different search query</p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-b border-border bg-slate-50/50 dark:bg-slate-900/10 hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} className="h-11 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="border-b border-border hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-6 py-3.5 text-slate-705 dark:text-slate-350 align-middle font-medium">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 bg-slate-50/30 dark:bg-slate-900/10 border-t border-border text-xs text-muted-foreground flex justify-between items-center shrink-0">
            <span className="font-semibold text-muted-foreground">
              Showing {pageIndex * PAGE_SIZE + 1}-{Math.min((pageIndex + 1) * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} entries
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageIndex(pageIndex - 1)}
                disabled={pageIndex === 0}
                className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
              >
                Previous
              </Button>
              {paginationPages.map((p, idx) =>
                p === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="flex size-7 items-center justify-center text-[12px] text-muted-foreground">
                    &hellip;
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={pageIndex === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPageIndex(p)}
                    className={cn(
                      'h-7 min-w-7 rounded-lg px-1 text-[11px] font-semibold',
                      pageIndex === p
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border-border text-muted-foreground bg-card hover:bg-muted',
                    )}
                  >
                    {p + 1}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageIndex(pageIndex + 1)}
                disabled={pageIndex >= pageCount - 1}
                className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Upcoming Expirations Table ───────────────────────────────────────────────

function ExpirationsTable({ orgSlug, memberId }: { orgSlug: string; memberId: string }) {
  const { data, isLoading, isError } = useWarrantyFeedQuery(orgSlug, memberId);
  const rows = data?.items ?? [];
  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState('');

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.assetName.toLowerCase().includes(q) ||
        r.assetCode.toLowerCase().includes(q) ||
        (r.model ?? '').toLowerCase().includes(q) ||
        (r.employeeName ?? '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));

  const columns = useMemo(
    () => [
      {
        id: 'assetName',
        header: 'Asset',
        accessorKey: 'assetName',
        cell: ({ row: r }: { row: { original: WarrantyExpirationFeedItem } }) => {
          const item = r.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-slate-50/50 dark:bg-slate-900/10 text-muted-foreground">
                <LaptopMinimal className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">{item.assetName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{item.assetCode}{item.serialNumber ? ` · ${item.serialNumber}` : ''}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'model',
        header: 'Model',
        accessorKey: 'model',
        cell: ({ getValue }: { getValue: () => string | null }) => (
          <span className="text-[13px] text-slate-550 dark:text-slate-400 font-medium">{getValue() || '—'}</span>
        ),
      },
      {
        id: 'employeeName',
        header: 'Assigned To',
        accessorKey: 'employeeName',
        cell: ({ getValue }: { getValue: () => string | null }) => (
          <span className="text-[13px] text-slate-700 dark:text-slate-350 font-medium">{getValue() || '—'}</span>
        ),
      },
      {
        id: 'warrantyExpiryDate',
        header: 'Expiry Date',
        accessorKey: 'warrantyExpiryDate',
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] tabular-nums text-slate-755 dark:text-slate-300 font-medium">{formatDate(getValue())}</span>
        ),
      },
      {
        id: 'daysUntilExpiry',
        header: 'Days Left',
        accessorKey: 'daysUntilExpiry',
        cell: ({ getValue }: { getValue: () => number }) => {
          const days = getValue();
          return (
            <span className={cn('text-[13px] tabular-nums font-semibold',
              days <= 30 ? 'text-red-600 dark:text-red-400' : days <= 90 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-750 dark:text-slate-300')}>
              {days}d
            </span>
          );
        },
      },
      {
        id: 'hasReminderSent',
        header: 'Reminder',
        accessorFn: (row: WarrantyExpirationFeedItem) => (row.hasReminderSent ? 'Sent' : 'Pending'),
        cell: ({ row: r }: { row: { original: WarrantyExpirationFeedItem } }) => (
          r.original.hasReminderSent
            ? <Badge className="rounded-md border-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 text-[11px] font-semibold">Sent</Badge>
            : <Badge className="rounded-md border-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-0.5 text-[11px] font-semibold">Pending</Badge>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { pagination: { pageIndex, pageSize: PAGE_SIZE } },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const next = updater({ pageIndex, pageSize: PAGE_SIZE });
        setPageIndex(next.pageIndex);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    pageCount,
  });

  const paginationPages = useMemo(() => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i);
    }
    const pages: (number | 'ellipsis')[] = [0];
    if (pageIndex > 2) pages.push('ellipsis');
    const start = Math.max(1, pageIndex - 1);
    const end = Math.min(pageCount - 2, pageIndex + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (pageIndex < pageCount - 3) pages.push('ellipsis');
    pages.push(pageCount - 1);
    return pages;
  }, [pageIndex, pageCount]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60 border border-border" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] px-6 py-14 text-center">
        <div>
          <AlertTriangle className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-2 text-[14px] font-semibold text-foreground">Failed to load warranty data</p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] px-6 py-14 text-center">
        <div>
          <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-[#f9fafb] dark:bg-slate-900/50">
            <PackageOpen className="size-5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-[15px] font-semibold text-foreground">No upcoming expirations</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">All warranties are up to date</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden flex flex-col">
      {/* Search Header inside container */}
      <div className="px-8 py-6 border-b border-border">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search expirations..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPageIndex(0);
              }}
              className="pl-9 bg-muted/30 border border-border focus:bg-background text-sm h-9 rounded-xl focus:ring-1 focus:ring-primary focus-visible:ring-1"
            />
          </div>
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="flex items-center justify-center bg-card px-6 py-14 text-center">
          <div>
            <PackageOpen className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-[14px] font-semibold text-foreground">No matching expiration records</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Try a different search query</p>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-b border-border bg-slate-50/50 dark:bg-slate-900/10 hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} className="h-11 px-6 text-[12px] font-semibold text-[#86868b] uppercase tracking-wider">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="border-b border-border hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-6 py-3.5 text-slate-705 dark:text-slate-350 align-middle font-medium">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 bg-slate-50/30 dark:bg-slate-900/10 border-t border-border text-xs text-muted-foreground flex justify-between items-center shrink-0">
            <span className="font-semibold text-muted-foreground">
              Showing {pageIndex * PAGE_SIZE + 1}-{Math.min((pageIndex + 1) * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} entries
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageIndex(pageIndex - 1)}
                disabled={pageIndex === 0}
                className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
              >
                Previous
              </Button>
              {paginationPages.map((p, idx) =>
                p === 'ellipsis' ? (
                  <span key={`e-${idx}`} className="flex size-7 items-center justify-center text-[12px] text-muted-foreground">
                    &hellip;
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={pageIndex === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPageIndex(p)}
                    className={cn(
                      'h-7 min-w-7 rounded-lg px-1 text-[11px] font-semibold',
                      pageIndex === p
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border-border text-muted-foreground bg-card hover:bg-muted',
                    )}
                  >
                    {p + 1}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPageIndex(pageIndex + 1)}
                disabled={pageIndex >= pageCount - 1}
                className="h-7 rounded-lg border-border px-2.5 text-[11px] font-semibold bg-card hover:bg-muted"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Tab ─────────────────────────────────────────────────────────────────

export function InventoryTab({
  orgSlug,
  memberId,
  canManageAssets,
  members,
}: {
  orgSlug: string;
  memberId: string;
  canManageAssets: boolean;
  members: { id: string; label: string }[];
}) {
  const [subTab, setSubTab] = useState<SubTab>('brand-model');

  const subTabs: { value: SubTab; label: string }[] = [
    { value: 'brand-model', label: 'Brand & Model Breakdown' },
    { value: 'os-distribution', label: 'OS Distribution' },
    { value: 'expirations', label: 'Upcoming Expirations' },
  ];

  return (
    <div className="w-full">
      <div className="mb-5">
        <h2 className="text-[18px] font-semibold text-[#111827]">Inventory</h2>
        <p className="mt-0.5 text-[13px] text-[#6b7280]">
          Full inventory breakdown of assets, OS usage, and warranty expirations
        </p>
      </div>

      {canManageAssets && (
        <div className="mb-4">
          <ExportBand
            orgSlug={orgSlug}
            memberId={memberId}
            members={members}
            domain="inventory"
            showEmployeeFilter={false}
          />
        </div>
      )}
      <div className="mb-4 inline-flex items-center rounded-xl border border-black/4 bg-neutral-50 p-1">
        {subTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setSubTab(tab.value)}
            className={cn(
              'inline-flex h-8 items-center rounded-lg px-4 text-[13px] font-medium transition-all duration-200 ease-out',
              subTab === tab.value
                ? 'bg-white text-[#1d1d1f] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                : 'text-neutral-500 hover:text-neutral-900',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'brand-model' && <BrandModelTable orgSlug={orgSlug} memberId={memberId} />}
      {subTab === 'os-distribution' && <OsDistributionTable orgSlug={orgSlug} memberId={memberId} />}
      {subTab === 'expirations' && <ExpirationsTable orgSlug={orgSlug} memberId={memberId} />}
    </div>
  );
}
