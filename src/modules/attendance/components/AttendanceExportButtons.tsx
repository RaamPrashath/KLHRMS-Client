'use client';

import { useState } from 'react';
import { FileSpreadsheet, FileText, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  exportAttendanceAction,
  type AttendanceExportFormat,
  type AttendanceExportRow,
  type AttendancePivotExportPayload,
  type PivotEmployeeRow,
  type PivotCell,
} from '@/modules/attendance/api/attendanceServerActions';
import type { AttendanceRecord } from '@/modules/attendance/types/attendanceTypes';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'weekly' | 'monthly';

interface AttendanceExportButtonsProps {
  orgSlug: string;
  memberId: string;
  // list mode
  records: AttendanceExportRow[];
  showEmployeeColumn: boolean;
  title: string;
  disabled?: boolean;
  // pivot mode
  viewMode?: ViewMode;
  pivotRecords?: AttendanceRecord[];   // raw records for the pivot period
  pivotDateColumns?: string[];         // ordered YYYY-MM-DD strings
  pivotPeriodLabel?: string;
}

// ─── Download trigger ─────────────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Force-8-hours helpers ────────────────────────────────────────────────────

const FORCE_HOURS = 8;

function addHoursToISO(isoDatetime: string, hours: number): string {
  try {
    const normalized = isoDatetime.endsWith('Z') || isoDatetime.includes('+')
      ? isoDatetime
      : `${isoDatetime}Z`;
    const ms = new Date(normalized).getTime() + hours * 3_600_000;
    return new Date(ms).toISOString();
  } catch {
    return isoDatetime;
  }
}

/** Cap list-mode records to 8h max */
function applyForce8List(records: AttendanceExportRow[]): AttendanceExportRow[] {
  return records.map((r) => {
    const needsCap = r.totalHours != null && r.totalHours > FORCE_HOURS;
    if (needsCap) {
      const newClockOut = r.clockIn
        ? addHoursToISO(r.clockIn, FORCE_HOURS)
        : r.clockOut;
      return { ...r, clockOut: newClockOut, totalHours: FORCE_HOURS };
    }
    return r;
  });
}

/** Cap a single totalHours value to 8h max */
function capHours(h: number | null): number | null {
  if (h == null) return null;
  return h > FORCE_HOURS ? FORCE_HOURS : h;
}

// ─── Pivot payload builder ────────────────────────────────────────────────────

function buildPivotPayload(
  records: AttendanceRecord[],
  dateColumns: string[],
  periodLabel: string,
  force8: boolean,
): AttendancePivotExportPayload {
  // Group records by employeeId
  const byEmployee = new Map<string, { name: string; byDate: Map<string, AttendanceRecord> }>();

  for (const r of records) {
    if (!byEmployee.has(r.employeeId)) {
      byEmployee.set(r.employeeId, {
        name: r.employeeName ?? r.employeeId,
        byDate: new Map(),
      });
    }
    byEmployee.get(r.employeeId)!.byDate.set(r.date, r);
  }

  const rows: PivotEmployeeRow[] = Array.from(byEmployee.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, byDate }) => {
      const cells: PivotCell[] = dateColumns.map((ymd) => {
        const rec = byDate.get(ymd);
        if (!rec) return { date: ymd, totalHours: null, status: null };
        const hours = force8 ? capHours(rec.totalHours) : rec.totalHours;
        return { date: ymd, totalHours: hours, status: rec.status };
      });

      const total = cells.reduce((sum, c) => sum + (c.totalHours ?? 0), 0);
      return { employeeName: name, cells, total };
    });

  return { dateColumns, rows, periodLabel };
}

// ─── Format config ────────────────────────────────────────────────────────────

const FORMAT_CONFIG: {
  format: AttendanceExportFormat;
  label: string;
  ext: string;
  icon: React.ReactNode;
}[] = [
  {
    format: 'xlsx',
    label: 'Excel',
    ext: 'xlsx',
    icon: <FileSpreadsheet className="size-3.5" aria-hidden="true" />,
  },
  {
    format: 'pdf',
    label: 'PDF',
    ext: 'pdf',
    icon: <FileText className="size-3.5" aria-hidden="true" />,
  },
  {
    format: 'csv',
    label: 'CSV',
    ext: 'csv',
    icon: <FileDown className="size-3.5" aria-hidden="true" />,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function AttendanceExportButtons({
  orgSlug,
  memberId,
  records,
  showEmployeeColumn,
  title,
  disabled = false,
  viewMode = 'list',
  pivotRecords = [],
  pivotDateColumns = [],
  pivotPeriodLabel = '',
}: Readonly<AttendanceExportButtonsProps>) {
  const [pending, setPending] = useState<AttendanceExportFormat | null>(null);
  const [force8, setForce8] = useState(true);

  const isPivot = viewMode === 'weekly' || viewMode === 'monthly';

  async function handleExport(format: AttendanceExportFormat) {
    if (pending || disabled) return;

    // Check there's something to export
    const hasData = isPivot ? pivotRecords.length > 0 : records.length > 0;
    if (!hasData) return;

    setPending(format);
    try {
      let blob: Blob;

      if (isPivot) {
        const pivotData = buildPivotPayload(
          pivotRecords,
          pivotDateColumns,
          pivotPeriodLabel,
          force8,
        );
        blob = await exportAttendanceAction({
          orgSlug,
          memberId,
          format,
          title,
          exportMode: 'pivot',
          pivotData,
        });
      } else {
        const exportRecords = force8 ? applyForce8List(records) : records;
        blob = await exportAttendanceAction({
          orgSlug,
          memberId,
          format,
          records: exportRecords,
          showEmployeeColumn,
          title,
          exportMode: 'list',
        });
      }

      const ext = FORMAT_CONFIG.find((f) => f.format === format)?.ext ?? format;
      triggerDownload(blob, `attendance.${ext}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Export failed. Please try again.';
      toast.error(message);
    } finally {
      setPending(null);
    }
  }

  const isEmpty = isPivot ? pivotRecords.length === 0 : records.length === 0;

  return (
    <div className="flex flex-col items-end gap-2">
      {/* Export buttons row */}
      <div className="flex items-center gap-1.5" aria-label="Export attendance">
        {FORMAT_CONFIG.map(({ format, label, icon }) => {
          const isLoading = pending === format;
          const isDisabled = disabled || isEmpty || pending !== null;

          return (
            <button
              key={format}
              type="button"
              onClick={() => handleExport(format)}
              disabled={isDisabled}
              aria-label={`Export as ${label}`}
              title={isEmpty ? 'No records to export' : `Export as ${label}`}
              className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium rounded-md border transition-all duration-150 select-none
                bg-surface border-neutral-200 text-neutral-600
                hover:border-neutral-300 hover:text-neutral-900 hover:bg-neutral-50
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:border-neutral-200 disabled:hover:text-neutral-600
                active:scale-[0.97]"
            >
              {isLoading ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                icon
              )}
              {label}
            </button>
          );
        })}
      </div>

      {/* Force 8 hours checkbox */}
      <label className="flex items-center gap-2 cursor-pointer select-none group">
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            checked={force8}
            onChange={(e) => setForce8(e.target.checked)}
            className="peer sr-only"
            aria-label="Force 8 hours maximum per record"
          />
          <div className="h-3.5 w-3.5 rounded-[3px] border border-neutral-300 bg-surface transition-all duration-150
            peer-checked:bg-primary peer-checked:border-primary
            peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30
            group-hover:border-neutral-400">
            {force8 && (
              <svg
                viewBox="0 0 10 8"
                fill="none"
                className="absolute inset-0 m-auto w-2.5 h-2 text-white"
                aria-hidden="true"
              >
                <path
                  d="M1 4l2.5 2.5L9 1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>
        <span className="text-[11px] font-medium text-neutral-500 group-hover:text-neutral-700 transition-colors duration-150">
          Force 8 hrs max
        </span>
      </label>
    </div>
  );
}
