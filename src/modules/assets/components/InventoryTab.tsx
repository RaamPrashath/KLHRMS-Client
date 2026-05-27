'use client';

import { useMemo, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { AlertTriangle, ChevronLeft, ChevronRight, LaptopMinimal, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const columns = useMemo(
    () => [
      {
        id: 'brand',
        header: 'Brand',
        accessorKey: 'brand',
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] font-medium text-[#111827]">{getValue()}</span>
        ),
      },
      {
        id: 'model',
        header: 'Model',
        accessorKey: 'model',
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] text-[#6b7280]">{getValue()}</span>
        ),
      },
      {
        id: 'totalStock',
        header: 'Total Stock',
        accessorKey: 'totalStock',
        cell: ({ getValue }: { getValue: () => number }) => (
          <span className="text-[13px] font-medium tabular-nums text-[#374151]">{getValue()}</span>
        ),
      },
      {
        id: 'inOfficeStock',
        header: 'In Office',
        accessorKey: 'inOfficeStock',
        cell: ({ row: r }: { row: { original: BrandModelInventoryRow } }) => {
          const v = r.original.inOfficeStock;
          return (
            <span className={cn('text-[13px] tabular-nums', v === 0 ? 'text-[#b3261e] font-medium' : 'text-[#374151]')}>
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
          <span className="text-[13px] tabular-nums text-[#374151]">{getValue()}</span>
        ),
      },
      {
        id: 'maintenanceOrDamagedStock',
        header: 'Maint.',
        accessorKey: 'maintenanceOrDamagedStock',
        cell: ({ getValue }: { getValue: () => number }) => (
          <span className="text-[13px] tabular-nums text-[#374151]">{getValue()}</span>
        ),
      },
      {
        id: 'lowStockAlert',
        header: 'Alert',
        accessorFn: (row: BrandModelInventoryRow) => (row.lowStockAlert ? 'Low Stock' : 'OK'),
        cell: ({ row: r }: { row: { original: BrandModelInventoryRow } }) =>
          r.original.lowStockAlert ? (
            <span className="rounded-md bg-[#fff3f2] px-2 py-0.5 text-[11px] font-medium text-[#b3261e]">Low Stock</span>
          ) : (
            <span className="text-[12px] text-[#9ca3af]">—</span>
          ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-[#f3f4f6]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white px-6 py-14 text-center">
        <div>
          <AlertTriangle className="mx-auto size-6 text-[#9ca3af]" />
          <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">Failed to load brand & model data</p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white px-6 py-14 text-center">
        <div>
          <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-[#f9fafb]">
            <PackageOpen className="size-5 text-[#9ca3af]" />
          </div>
          <p className="mt-3 text-[15px] font-medium text-[#111827]">No brand & model data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-b-2 border-[#e2e5ea]">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="h-10 px-3 text-[13px] font-semibold text-[#6b7280]">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="group border-b border-[#e5e7eb] transition-colors hover:bg-[#f8f9fa]">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-3 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t border-[#e5e7eb] bg-[#fafbfc] px-4 py-2.5">
        <p className="text-[12px] text-[#6b7280]">
          {pageIndex * PAGE_SIZE + 1}&ndash;{Math.min((pageIndex + 1) * PAGE_SIZE, rows.length)} of {rows.length}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setPageIndex(pageIndex - 1)} disabled={pageIndex === 0}
            className="size-7 rounded-md text-[#6b7280] hover:text-[#111827] disabled:opacity-30">
            <ChevronLeft className="size-3.5" />
          </Button>
          {Array.from({ length: pageCount }).map((_, i) => (
            <Button key={i} variant="ghost" size="icon" onClick={() => setPageIndex(i)}
              className={cn('size-7 rounded-md text-[12px] font-medium',
                pageIndex === i
                  ? 'bg-[#111827] text-white hover:bg-[#111827]'
                  : 'text-[#6b7280] hover:text-[#111827]')}>
              {i + 1}
            </Button>
          ))}
          <Button variant="ghost" size="icon" onClick={() => setPageIndex(pageIndex + 1)} disabled={pageIndex >= pageCount - 1}
            className="size-7 rounded-md text-[#6b7280] hover:text-[#111827] disabled:opacity-30">
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── OS Distribution Table ────────────────────────────────────────────────────

function OsDistributionTable({ orgSlug, memberId }: { orgSlug: string; memberId: string }) {
  const { data, isLoading, isError } = useOsDistributionQuery(orgSlug, memberId);
  const rows = data?.rows ?? [];
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const columns = useMemo(
    () => [
      {
        id: 'osName',
        header: 'OS',
        accessorKey: 'osName',
        cell: ({ getValue }: { getValue: () => string }) => {
          const os = getValue();
          const dotColor: Record<string, string> = {
            macOS: 'bg-[#6b7280]',
            Windows: 'bg-[#3b82f6]',
            Linux: 'bg-[#f59e0b]',
            Ubuntu: 'bg-[#f97316]',
          };
          return (
            <div className="flex items-center gap-2">
              <span className={cn('size-2 rounded-full shrink-0', dotColor[os] || 'bg-[#9ca3af]')} />
              <span className="text-[13px] font-medium text-[#111827]">{os}</span>
            </div>
          );
        },
      },
      {
        id: 'headcount',
        header: 'Users',
        accessorKey: 'headcount',
        cell: ({ getValue }: { getValue: () => number }) => (
          <span className="text-[13px] tabular-nums font-medium text-[#374151]">{getValue()}</span>
        ),
      },
      {
        id: 'percentage',
        header: 'Share',
        accessorKey: 'percentage',
        cell: ({ getValue }: { getValue: () => number }) => {
          const pct = Math.round(getValue());
          return (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-[#e5e7eb]">
                <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[12px] tabular-nums text-[#6b7280]">{pct}%</span>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-[#f3f4f6]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white px-6 py-14 text-center">
        <div>
          <AlertTriangle className="mx-auto size-6 text-[#9ca3af]" />
          <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">Failed to load OS distribution</p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white px-6 py-14 text-center">
        <div>
          <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-[#f9fafb]">
            <LaptopMinimal className="size-5 text-[#9ca3af]" />
          </div>
          <p className="mt-3 text-[15px] font-medium text-[#111827]">No OS distribution data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-b-2 border-[#e2e5ea]">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="h-10 px-3 text-[13px] font-semibold text-[#6b7280]">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="group border-b border-[#e5e7eb] transition-colors hover:bg-[#f8f9fa]">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-3 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t border-[#e5e7eb] bg-[#fafbfc] px-4 py-2.5">
        <p className="text-[12px] text-[#6b7280]">
          {pageIndex * PAGE_SIZE + 1}&ndash;{Math.min((pageIndex + 1) * PAGE_SIZE, rows.length)} of {rows.length}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setPageIndex(pageIndex - 1)} disabled={pageIndex === 0}
            className="size-7 rounded-md text-[#6b7280] hover:text-[#111827] disabled:opacity-30">
            <ChevronLeft className="size-3.5" />
          </Button>
          {Array.from({ length: pageCount }).map((_, i) => (
            <Button key={i} variant="ghost" size="icon" onClick={() => setPageIndex(i)}
              className={cn('size-7 rounded-md text-[12px] font-medium',
                pageIndex === i
                  ? 'bg-[#111827] text-white hover:bg-[#111827]'
                  : 'text-[#6b7280] hover:text-[#111827]')}>
              {i + 1}
            </Button>
          ))}
          <Button variant="ghost" size="icon" onClick={() => setPageIndex(pageIndex + 1)} disabled={pageIndex >= pageCount - 1}
            className="size-7 rounded-md text-[#6b7280] hover:text-[#111827] disabled:opacity-30">
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Upcoming Expirations Table ───────────────────────────────────────────────

function ExpirationsTable({ orgSlug, memberId }: { orgSlug: string; memberId: string }) {
  const { data, isLoading, isError } = useWarrantyFeedQuery(orgSlug, memberId);
  const rows = data?.items ?? [];
  const [pageIndex, setPageIndex] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

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
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#e5e7eb] bg-[#fafafa] text-[#6b7280]">
                <LaptopMinimal className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-[#111827]">{item.assetName}</p>
                <p className="truncate text-[12px] text-[#6b7280]">{item.assetCode}{item.serialNumber ? ` · ${item.serialNumber}` : ''}</p>
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
          <span className="text-[13px] text-[#6b7280]">{getValue() || '—'}</span>
        ),
      },
      {
        id: 'employeeName',
        header: 'Assigned To',
        accessorKey: 'employeeName',
        cell: ({ getValue }: { getValue: () => string | null }) => (
          <span className="text-[13px] text-[#374151]">{getValue() || '—'}</span>
        ),
      },
      {
        id: 'warrantyExpiryDate',
        header: 'Expiry Date',
        accessorKey: 'warrantyExpiryDate',
        cell: ({ getValue }: { getValue: () => string }) => (
          <span className="text-[13px] tabular-nums text-[#6b7280]">{formatDate(getValue())}</span>
        ),
      },
      {
        id: 'daysUntilExpiry',
        header: 'Days Left',
        accessorKey: 'daysUntilExpiry',
        cell: ({ getValue }: { getValue: () => number }) => {
          const days = getValue();
          return (
            <span className={cn('text-[13px] tabular-nums font-medium',
              days <= 1 ? 'text-[#b3261e]' : days <= 3 ? 'text-[#d97706]' : 'text-[#374151]')}>
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
            ? <span className="rounded-md bg-[#f3fbf5] px-2 py-0.5 text-[11px] font-medium text-[#156f3d]">Sent</span>
            : <span className="rounded-md bg-[#fff7e8] px-2 py-0.5 text-[11px] font-medium text-[#8a5a00]">Pending</span>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-[#f3f4f6]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white px-6 py-14 text-center">
        <div>
          <AlertTriangle className="mx-auto size-6 text-[#9ca3af]" />
          <p className="mt-2 text-[14px] font-medium text-[#1d1d1f]">Failed to load warranty data</p>
        </div>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white px-6 py-14 text-center">
        <div>
          <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-[#f9fafb]">
            <PackageOpen className="size-5 text-[#9ca3af]" />
          </div>
          <p className="mt-3 text-[15px] font-medium text-[#111827]">No upcoming expirations</p>
          <p className="mt-0.5 text-[13px] text-[#6b7280]">All warranties are up to date</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="border-b-2 border-[#e2e5ea]">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="h-10 px-3 text-[13px] font-semibold text-[#6b7280]">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="group border-b border-[#e5e7eb] transition-colors hover:bg-[#f8f9fa]">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-3 py-2.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t border-[#e5e7eb] bg-[#fafbfc] px-4 py-2.5">
        <p className="text-[12px] text-[#6b7280]">
          {pageIndex * PAGE_SIZE + 1}&ndash;{Math.min((pageIndex + 1) * PAGE_SIZE, rows.length)} of {rows.length}
        </p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setPageIndex(pageIndex - 1)} disabled={pageIndex === 0}
            className="size-7 rounded-md text-[#6b7280] hover:text-[#111827] disabled:opacity-30">
            <ChevronLeft className="size-3.5" />
          </Button>
          {Array.from({ length: pageCount }).map((_, i) => (
            <Button key={i} variant="ghost" size="icon" onClick={() => setPageIndex(i)}
              className={cn('size-7 rounded-md text-[12px] font-medium',
                pageIndex === i
                  ? 'bg-[#111827] text-white hover:bg-[#111827]'
                  : 'text-[#6b7280] hover:text-[#111827]')}>
              {i + 1}
            </Button>
          ))}
          <Button variant="ghost" size="icon" onClick={() => setPageIndex(pageIndex + 1)} disabled={pageIndex >= pageCount - 1}
            className="size-7 rounded-md text-[#6b7280] hover:text-[#111827] disabled:opacity-30">
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Tab ─────────────────────────────────────────────────────────────────

export function InventoryTab({
  orgSlug,
  memberId,
}: {
  orgSlug: string;
  memberId: string;
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
