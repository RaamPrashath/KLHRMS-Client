'use client';

import { useState, useCallback } from 'react';
import { Plus, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getTodayIST } from '@/modules/attendance/utils/attendanceFormatters';
import { useBulkAttendanceData } from '@/modules/attendance/hooks/use-bulk-attendance-data';
import { WorkLogDialog } from '@/app/(authenticated)/[orgSlug]/timesheet/_components/WorkLogDialog';
import type { WorkLogFormValues } from '@/app/(authenticated)/[orgSlug]/timesheet/_components/WorkLogForm';
import type {
  LocalWorkLog,
  WorkLogDialogState,
} from '@/modules/attendance/types/bulkAttendanceTypes';

interface TodayWorkLogsCardProps {
  orgSlug: string;
  memberId: string;
}

const CLOSED_DIALOG: WorkLogDialogState = {
  open: false,
  mode: 'create',
  date: null,
  log: null,
};

function formatDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(diffMs / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function TodayWorkLogsCard({ orgSlug, memberId }: Readonly<TodayWorkLogsCardProps>) {
  const today = getTodayIST();

  const {
    dayMap,
    isLoading,
    saveDayLogs,
    deleteDayEntry,
    optimisticUpdateDay,
    rollbackDay,
  } = useBulkAttendanceData(orgSlug, memberId);

  const [dialogState, setDialogState] = useState<WorkLogDialogState>(CLOSED_DIALOG);
  const [isSavingDialog, setIsSavingDialog] = useState(false);

  const todayData = dayMap.get(today);
  const logs = todayData?.logs ?? [];

  // ── Open create dialog ───────────────────────────────────────────────────────
  const handleOpenCreate = useCallback(() => {
    const [y, m, d] = today.split('-').map(Number);
    const start = new Date(y!, m! - 1, d!, 9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);
    setDialogState({
      open: true,
      mode: 'create',
      date: today,
      log: {
        id: crypto.randomUUID(),
        startTime: start,
        endTime: end,
        title: null,
        notes: null,
        isOptimistic: true,
      },
    });
  }, [today]);

  // ── Open edit dialog ─────────────────────────────────────────────────────────
  const handleOpenEdit = useCallback(
    (log: LocalWorkLog) => {
      setDialogState({
        open: true,
        mode: 'edit',
        date: today,
        log,
      });
    },
    [today],
  );

  // ── Close dialog ─────────────────────────────────────────────────────────────
  const handleCloseDialog = useCallback(() => {
    setDialogState(CLOSED_DIALOG);
  }, []);

  // ── Save from dialog ─────────────────────────────────────────────────────────
  const handleDialogSave = useCallback(
    async (date: string, values: WorkLogFormValues) => {
      setIsSavingDialog(true);

      const currentDay = dayMap.get(date) ?? null;
      const snapshot = currentDay
        ? { ...currentDay, logs: [...(currentDay.logs ?? [])] }
        : null;
      const existingLogs = currentDay?.logs ?? [];

      const newLog: LocalWorkLog = {
        id:
          dialogState.mode === 'edit' && dialogState.log
            ? dialogState.log.id
            : crypto.randomUUID(),
        startTime: values.startTime,
        endTime: values.endTime,
        title: values.title,
        notes: values.notes,
        isOptimistic: true,
      };

      let finalLogs: LocalWorkLog[];
      if (dialogState.mode === 'edit' && dialogState.log) {
        finalLogs = existingLogs.map((l) =>
          l.id === dialogState.log!.id ? newLog : l,
        );
      } else {
        finalLogs = [...existingLogs, newLog];
      }
      finalLogs.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      optimisticUpdateDay(date, () => ({
        date,
        attendanceRecordId: currentDay?.attendanceRecordId ?? null,
        clockIn: currentDay?.clockIn ?? null,
        clockOut: currentDay?.clockOut ?? null,
        totalHours: currentDay?.totalHours ?? null,
        overtimeHours: currentDay?.overtimeHours ?? null,
        status: currentDay?.status ?? null,
        logs: finalLogs,
      }));

      try {
        await saveDayLogs(date, finalLogs);
        setDialogState(CLOSED_DIALOG);
      } catch (err: unknown) {
        rollbackDay(date, snapshot);
        const msg =
          (err as { message?: string }).message ?? 'Failed to save work log';
        toast.error(msg);
      } finally {
        setIsSavingDialog(false);
      }
    },
    [dialogState, dayMap, optimisticUpdateDay, rollbackDay, saveDayLogs],
  );

  // ── Delete log ───────────────────────────────────────────────────────────────
  const handleDeleteLog = useCallback(
    async (logId: string) => {
      const currentDay = dayMap.get(today) ?? null;
      const snapshot = currentDay
        ? { ...currentDay, logs: [...(currentDay.logs ?? [])] }
        : null;

      const remainingLogs = (currentDay?.logs ?? []).filter((l) => l.id !== logId);

      optimisticUpdateDay(today, (prev) => ({
        date: today,
        attendanceRecordId: prev?.attendanceRecordId ?? null,
        clockIn: prev?.clockIn ?? null,
        clockOut: prev?.clockOut ?? null,
        totalHours: prev?.totalHours ?? null,
        overtimeHours: prev?.overtimeHours ?? null,
        status: prev?.status ?? null,
        logs: remainingLogs,
      }));

      try {
        if (remainingLogs.length === 0) {
          await deleteDayEntry(today);
        } else {
          await saveDayLogs(today, remainingLogs);
        }
      } catch (err: unknown) {
        rollbackDay(today, snapshot);
        const msg =
          (err as { message?: string }).message ?? 'Failed to delete work log';
        toast.error(msg);
      }
    },
    [today, dayMap, optimisticUpdateDay, rollbackDay, saveDayLogs, deleteDayEntry],
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-hairline bg-surface p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[17px] font-semibold tracking-tight text-ink">Today's Work Logs</h3>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-canvas" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border border-hairline bg-surface p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[17px] font-semibold tracking-tight text-ink">Today's Work Logs</h3>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-pill bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-all duration-200 hover:bg-primary-focus active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus focus-visible:ring-offset-2"
            aria-label="Add a new work log"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Add Log
          </button>
        </div>

        {logs.length === 0 ? (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-hairline bg-canvas/50 py-12 text-center transition-all duration-200 hover:border-surface-muted hover:bg-canvas active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus focus-visible:ring-offset-2"
          >
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-surface">
              <Clock className="size-5 text-ink-muted-48" aria-hidden="true" />
            </div>
            <p className="text-[15px] font-semibold text-ink">No work logs yet</p>
            <p className="mt-1 text-[13px] text-ink-muted-48">
              Add your first log to track today's work
            </p>
          </button>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-divider-soft bg-canvas/30 p-4 transition-all duration-200 hover:bg-canvas/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-ink" title={log.title ?? undefined}>
                    {log.title || 'Untitled'}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[13px] text-ink-muted-48">
                    <span className="font-mono tabular-nums">
                      {format(log.startTime, 'HH:mm')} – {format(log.endTime, 'HH:mm')}
                    </span>
                    <span className="text-hairline">·</span>
                    <span>{formatDuration(log.startTime, log.endTime)}</span>
                  </div>
                  {log.notes && (
                    <p className="mt-1.5 line-clamp-1 text-[12px] text-ink-muted-48" title={log.notes}>
                      {log.notes}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(log)}
                    className="rounded-md p-2 text-ink-muted-48 transition-all duration-200 hover:bg-surface hover:text-ink active:scale-[0.9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-focus"
                    aria-label={`Edit log: ${log.title || 'Untitled'}`}
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLog(log.id)}
                    className="rounded-md p-2 text-ink-muted-48 transition-all duration-200 hover:bg-rose-bg hover:text-rose-text active:scale-[0.9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-text"
                    aria-label={`Delete log: ${log.title || 'Untitled'}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <WorkLogDialog
        state={dialogState}
        onClose={handleCloseDialog}
        onSave={handleDialogSave}
        isPending={isSavingDialog}
      />
    </>
  );
}
