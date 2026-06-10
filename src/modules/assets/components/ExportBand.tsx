'use client';

import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  X,
} from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { exportAssetsInlineAction } from '@/modules/assets/api/exportAssetsInlineAction';
import type { AssetExportDomain, AssetExportFormat } from '@/modules/assets/types/assetTypes';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const FORMAT_STYLES: Record<AssetExportFormat, { label: string; bg: string; hover: string }> = {
  xlsx: { label: 'Excel', bg: 'bg-blue-600', hover: 'hover:bg-blue-700' },
  pdf: { label: 'PDF', bg: 'bg-red-600', hover: 'hover:bg-red-700' },
  csv: { label: 'CSV', bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700' },
};

interface EmployeeOption {
  id: string;
  label: string;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

export function ExportBand({
  orgSlug,
  memberId,
  members,
  domain,
  showEmployeeFilter = true,
  selectedEmployeeIds,
  onEmployeeFilterChange,
}: {
  orgSlug: string;
  memberId: string;
  members: EmployeeOption[];
  domain: AssetExportDomain;
  showEmployeeFilter?: boolean;
  selectedEmployeeIds?: string[];
  onEmployeeFilterChange?: (ids: string[]) => void;
}) {
  const today = new Date();
  const [monthCursor, setMonthCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(today),
    to: endOfMonth(today),
  });
  const [internalEmployeeIds, setInternalEmployeeIds] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');

  const effectiveEmployeeIds = selectedEmployeeIds ?? internalEmployeeIds;
  const setEffectiveEmployeeIds = onEmployeeFilterChange ?? setInternalEmployeeIds;
  const [pendingExport, setPendingExport] = useState<AssetExportFormat | null>(null);

  const displayLabel = useMemo(() => {
    const from = dateRange?.from ?? monthCursor;
    const to = dateRange?.to ?? endOfMonth(monthCursor);
    if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
      return `${MONTHS[from.getMonth()]} ${from.getFullYear()}`;
    }
    return `${MONTHS[from.getMonth()].slice(0, 3)} ${from.getDate()} - ${MONTHS[to.getMonth()].slice(0, 3)} ${to.getDate()}, ${to.getFullYear()}`;
  }, [dateRange, monthCursor]);

  const employeeFiltered = useMemo(() => {
    if (!employeeSearch.trim()) return members;
    const q = employeeSearch.toLowerCase();
    return members.filter((m) => m.label.toLowerCase().includes(q));
  }, [members, employeeSearch]);

  function prevMonth() {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setDateRange(undefined);
  }

  function nextMonth() {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setDateRange(undefined);
  }

  function toggleEmployee(id: string) {
    const next = effectiveEmployeeIds.includes(id)
      ? effectiveEmployeeIds.filter((v) => v !== id)
      : [...effectiveEmployeeIds, id];
    setEffectiveEmployeeIds(next);
  }

  async function handleExport(format: AssetExportFormat) {
    const from = dateRange?.from ?? monthCursor;
    const to = dateRange?.to ?? endOfMonth(monthCursor);
    setPendingExport(format);
    try {
      const blob = await exportAssetsInlineAction({
        orgSlug,
        memberId,
        domain,
        payload: {
          format,
          startDate: toYMD(from),
          endDate: toYMD(to),
          employeeIds: effectiveEmployeeIds,
        },
      });
      const stamp = toYMD(today);
      triggerDownload(blob, `${domain}-${stamp}.${format}`);
      toast.success(`${FORMAT_STYLES[format].label} downloaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setPendingExport(null);
    }
  }

  const selectedMembers = useMemo(
    () => members.filter((m) => effectiveEmployeeIds.includes(m.id)),
    [members, effectiveEmployeeIds],
  );

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {/* Month Navigation */}
      <div className="inline-flex items-center bg-muted/30 border border-border rounded-lg overflow-hidden h-9">
        <button
          type="button"
          onClick={prevMonth}
          className="h-full px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="px-3 text-xs font-semibold tracking-tight text-foreground border-x border-border/80 h-full flex items-center bg-card/25 min-w-[170px] justify-center select-none font-mono">
          {displayLabel}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="h-full px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Custom Date Range */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1 px-3 h-9 rounded-lg border text-xs font-medium transition-colors',
              dateRange
                ? 'border-border bg-muted/30 text-foreground'
                : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            <CalendarDays className="size-4" />
            <span>{dateRange ? 'Custom Range' : 'Custom'}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            numberOfMonths={2}
            defaultMonth={monthCursor}
          />
        </PopoverContent>
      </Popover>

      {/* Employee Multi-Select Filter */}
      {showEmployeeFilter && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-1 px-3 h-9 rounded-lg border text-xs font-medium transition-colors',
                effectiveEmployeeIds.length > 0
                  ? 'border-border bg-muted/30 text-foreground'
                  : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              <ChevronsUpDown className="size-4" />
              <span>
                {effectiveEmployeeIds.length > 0
                  ? `${effectiveEmployeeIds.length} selected`
                  : 'All Employees'}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search employees..."
                value={employeeSearch}
                onValueChange={setEmployeeSearch}
              />
              <CommandList>
                <CommandEmpty>No employees found.</CommandEmpty>
                <CommandGroup>
                  {employeeFiltered.map((emp) => {
                    const isSelected = effectiveEmployeeIds.includes(emp.id);
                    return (
                      <CommandItem
                        key={emp.id}
                        onSelect={() => toggleEmployee(emp.id)}
                      >
                        <div
                          className={cn(
                            'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                            isSelected
                              ? 'border-[#111827] bg-[#111827] text-white'
                              : 'border-[#d1d5db]',
                          )}
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>
                        <span className="text-[13px]">{emp.label}</span>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1 border-t border-[#e5e7eb] p-2">
                  {selectedMembers.slice(0, 3).map((emp) => (
                    <span
                      key={emp.id}
                      className="inline-flex items-center gap-1 rounded-md bg-[#f3f4f6] px-2 py-0.5 text-[11px] text-[#6b7280]"
                    >
                      {emp.label.split(' ')[0]}
                      <button
                        type="button"
                        onClick={() => toggleEmployee(emp.id)}
                        className="hover:text-[#111827]"
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  {selectedMembers.length > 3 && (
                    <span className="text-[11px] text-[#9ca3af]">+{selectedMembers.length - 3} more</span>
                  )}
                </div>
              )}
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* Export Buttons */}
      <div className="flex items-center gap-1.5">
        {(Object.entries(FORMAT_STYLES) as [AssetExportFormat, typeof FORMAT_STYLES[AssetExportFormat]][]).map(
          ([format, style]) => {
            const isLoading = pendingExport === format;
            return (
              <button
                key={format}
                type="button"
                disabled={isLoading}
                onClick={() => handleExport(format)}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-medium text-white ${style.bg} ${style.hover} transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : format === 'xlsx' ? (
                  <FileSpreadsheet className="size-3.5" />
                ) : (
                  <FileText className="size-3.5" />
                )}
                {style.label}
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}
