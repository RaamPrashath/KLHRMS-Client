'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getTodayIST } from '@/modules/attendance/utils/attendanceFormatters';
import { useBulkAttendanceData } from '@/modules/attendance/hooks/use-bulk-attendance-data';
import { useProjectsQuery } from '@/modules/projects/hooks/useProjectsQuery';
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

  const { data: projects = [], isLoading: isLoadingProjects } = useProjectsQuery(orgSlug, memberId);

  const [dialogState, setDialogState] = useState<WorkLogDialogState>(CLOSED_DIALOG);
  const [isSavingDialog, setIsSavingDialog] = useState(false);

  const todayData = dayMap.get(today);
  const logs = todayData?.logs ?? [];

  // Create a lookup map for projects and tasks
  const projectTaskMap = useMemo(() => {
    const map = new Map<string, { projectName: string; taskName: string }>();
    for (const project of projects) {
      for (const task of project.tasks) {
        map.set(`${project.id}-${task.id}`, {
          projectName: project.name,
          taskName: task.name,
        });
      }
    }
    return map;
  }, [projects]);

  // Helper to get display title for a log
  const getLogTitle = useCallback((log: LocalWorkLog): string => {
    if (log.projectId && log.projectTaskId) {
      const key = `${log.projectId}-${log.projectTaskId}`;
      const info = projectTaskMap.get(key);
      if (info) {
        return `${info.projectName} - ${info.taskName}`;
      }
    }
    return log.title || 'Untitled';
  }, [projectTaskMap]);

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
        projectId: null,
        projectTaskId: null,
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
        projectId: values.projectId,
        projectTaskId: values.projectTaskId,
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

  if (isLoading || isLoadingProjects) {
    return (
      <div className="rounded-[18px] border border-hairline bg-canvas p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold tracking-[-0.374px] text-ink">Today's Work Logs</h3>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-surface-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-[18px] border border-hairline bg-canvas p-6">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold tracking-[-0.374px] text-ink">Today's Work Logs</h3>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-pill bg-primary px-4 py-2 text-[14px] font-medium text-white transition-all hover:bg-primary-focus active:scale-[0.95]"
            aria-label="Add a new work log"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Log
          </button>
        </div>

        {logs.length === 0 ? (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex w-full flex-col items-center justify-center rounded-[11px] border border-dashed border-hairline bg-surface-subtle py-12 text-center transition-all hover:border-ink-muted-48 hover:bg-surface-muted active:scale-[0.98]"
          >
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-canvas shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <Clock className="size-5 text-ink-muted-48" aria-hidden="true" />
            </div>
            <p className="text-[14px] font-semibold text-ink">No work logs yet</p>
            <p className="mt-1 text-[14px] text-ink-muted-48">
              Add your first log to track today's work
            </p>
          </button>
        ) : (
          <div className="flex flex-col">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between gap-4 border-b border-hairline py-4 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-semibold tracking-[-0.374px] text-ink" title={getLogTitle(log)}>
                    {getLogTitle(log)}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-[14px] text-ink-muted-48">
                    <span className="tabular-nums">
                      {format(log.startTime, 'h:mm a')} – {format(log.endTime, 'h:mm a')}
                    </span>
                    <span className="text-hairline">·</span>
                    <span>{formatDuration(log.startTime, log.endTime)}</span>
                  </div>
                  {log.notes && (
                    <p className="mt-2 line-clamp-2 text-[14px] text-ink-muted-80" title={log.notes}>
                      {log.notes}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(log)}
                    className="flex size-9 items-center justify-center rounded-full text-ink-muted-48 transition-colors hover:bg-surface-subtle hover:text-ink active:scale-[0.95]"
                    aria-label={`Edit log: ${getLogTitle(log)}`}
                  >
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteLog(log.id)}
                    className="flex size-9 items-center justify-center rounded-full text-ink-muted-48 transition-colors hover:bg-[#fff3f3] hover:text-[#a93434] active:scale-[0.95]"
                    aria-label={`Delete log: ${getLogTitle(log)}`}
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
