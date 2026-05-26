'use client';

import { useMemo, useState } from 'react';
import { ArrowDownUp, Boxes, Search, Warehouse } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { BrandModelInventoryAnalytics, BrandModelInventoryRow } from './dashboard.types';

type SortField = 'brand' | 'model';
type SortDirection = 'asc' | 'desc';

function headerButtonClass(active: boolean) {
  return cn(
    'inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-left text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors',
    active ? 'text-[#111827]' : 'text-[#6e6e73] hover:text-[#111827]',
  );
}

export function BrandModelInventoryMatrix({
  analytics,
  isLoading,
  activeRowKey,
  onRowClick,
}: {
  analytics?: BrandModelInventoryAnalytics;
  isLoading: boolean;
  activeRowKey: string | null;
  onRowClick: (row: BrandModelInventoryRow) => void;
}) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('brand');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const filteredRows = useMemo(() => {
    const rows = analytics?.rows ?? [];
    const query = search.toLowerCase().trim();
    const next = !query
      ? rows
      : rows.filter((row) => `${row.brand} ${row.model}`.toLowerCase().includes(query));

    return [...next].sort((a, b) => {
      const left = a[sortField].toLowerCase();
      const right = b[sortField].toLowerCase();
      const order = left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? order : -order;
    });
  }, [analytics?.rows, search, sortField, sortDirection]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDirection('asc');
  }

  return (
    <section className="rounded-[18px] border border-[#e5e7eb] bg-white px-5 py-4 shadow-[0_1px_0_rgba(17,24,39,0.03)]">
      <div className="flex flex-col gap-4 border-b border-[#eef0f3] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
            Brand &amp; Model Inventory Breakdown
          </h3>
          <p className="mt-1 text-[13px] text-[#6e6e73]">
            Laptop stock by brand and model across available, issued, and maintenance states
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:min-w-[320px]">
          <div className="flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
            <Search className="size-4 shrink-0 text-[#9ca3af]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search brand or model..."
              className="h-auto border-0 bg-transparent px-0 py-0 text-[13px] shadow-none focus-visible:ring-0 placeholder:text-[#9ca3af]"
            />
          </div>
          <div className="flex items-center justify-between text-[12px] text-[#6e6e73]">
            <span>{filteredRows.length} models</span>
            <span className="inline-flex items-center gap-1">
              <Warehouse className="size-3.5" />
              Temporary Laptop Stock depth: {analytics?.temporaryLaptopStockDepth ?? 0}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-left">
              <th className="border-b border-[#eef0f3] pb-3 pr-4">
                <button
                  type="button"
                  className={headerButtonClass(sortField === 'brand')}
                  onClick={() => toggleSort('brand')}
                >
                  Brand
                  <ArrowDownUp className="size-3.5" />
                </button>
              </th>
              <th className="border-b border-[#eef0f3] pb-3 pr-4">
                <button
                  type="button"
                  className={headerButtonClass(sortField === 'model')}
                  onClick={() => toggleSort('model')}
                >
                  Model
                  <ArrowDownUp className="size-3.5" />
                </button>
              </th>
              <th className="border-b border-[#eef0f3] pb-3 pr-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
                Total Stock
              </th>
              <th className="border-b border-[#eef0f3] pb-3 pr-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
                In-Office Stock
              </th>
              <th className="border-b border-[#eef0f3] pb-3 pr-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
                Provided Stock
              </th>
              <th className="border-b border-[#eef0f3] pb-3 pr-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
                Maintenance / Damaged
              </th>
              <th className="border-b border-[#eef0f3] pb-3 pr-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
                Temp Stock Depth
              </th>
              <th className="border-b border-[#eef0f3] pb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6e6e73]">
                Low Stock Alert
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={8} className="border-b border-[#f3f4f6] py-3">
                    <div className="h-9 animate-pulse rounded-lg bg-[#f3f4f6]" />
                  </td>
                </tr>
              ))
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-[13px] text-[#6e6e73]">
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <Boxes className="size-5 text-[#9ca3af]" />
                    <p className="mt-2 font-medium text-[#111827]">No laptop inventory matched</p>
                    <p className="mt-1 text-[#6e6e73]">
                      Try a different search term or add laptop inventory with model data.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const isBusy = activeRowKey === row.rowKey;
                return (
                  <tr
                    key={row.rowKey}
                    className="cursor-pointer transition-colors hover:bg-[#fafafa]"
                    onClick={() => onRowClick(row)}
                  >
                    <td className="border-b border-[#f3f4f6] py-3 pr-4 text-[14px] font-semibold text-[#111827]">
                      {row.brand}
                    </td>
                    <td className="border-b border-[#f3f4f6] py-3 pr-4 text-[14px] text-[#111827]">
                      <div className="flex items-center gap-2">
                        <span>{row.model}</span>
                        {isBusy && <span className="text-[11px] text-[#6e6e73]">Loading...</span>}
                      </div>
                    </td>
                    <td className="border-b border-[#f3f4f6] py-3 pr-4 text-[13px] text-[#111827]">
                      {row.totalStock}
                    </td>
                    <td
                      className={cn(
                        'border-b border-[#f3f4f6] py-3 pr-4 text-[13px] font-medium',
                        row.lowStockAlert ? 'text-[#b3261e]' : 'text-[#156f3d]',
                      )}
                    >
                      {row.inOfficeStock}
                    </td>
                    <td className="border-b border-[#f3f4f6] py-3 pr-4 text-[13px] text-[#111827]">
                      {row.providedStock}
                    </td>
                    <td className="border-b border-[#f3f4f6] py-3 pr-4 text-[13px] text-[#111827]">
                      {row.maintenanceOrDamagedStock}
                    </td>
                    <td className="border-b border-[#f3f4f6] py-3 pr-4 text-[13px] text-[#111827]">
                      {row.temporaryLaptopStockDepth}
                    </td>
                    <td
                      className={cn(
                        'border-b border-[#f3f4f6] py-3 text-[13px] font-semibold',
                        row.lowStockAlert ? 'text-[#b3261e]' : 'text-[#6e6e73]',
                      )}
                    >
                      {row.lowStockAlert ? 'Low stock: 0 in office' : 'Healthy'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
