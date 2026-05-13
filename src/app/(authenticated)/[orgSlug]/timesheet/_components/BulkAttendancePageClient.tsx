'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

import { BulkAttendanceCalendar } from './BulkAttendanceCalendar';
import { BulkAttendanceSkeleton } from './BulkAttendanceSkeleton';
import { BulkAttendanceToolbar } from './BulkAttendanceToolbar';
import { WorkLogDialog } from './WorkLogDialog';
import type { WorkLogFormValues } from './WorkLogForm';

import { useBulkAttendanceData } from '@/modules/attendance/hooks/use-bulk-attendance-data';
import { useBulkAttendancePermissions } from '@/modules/attendance/hooks/queries/attendance';
import { useHolidays } from '@/modules/leave/hooks/useHolidays';
import { useProjectsForAttendance } from '@/modules/projects/hooks/useProjectsForAttendance';

import type {
  LocalWorkLog,
  WorkLogDialogState,
} from '@/modules/attendance/types/bulkAttendanceTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLOSED_DIALOG: WorkLogDialogState = {
  open: false,
  mode: 'create',
  date: null,
  log: null,
};

// ─── Component ────────────────────────────────────────────────────────────────

interface BulkAttendancePageClientProps {
  orgSlug: string;
  memberId: string;
}

export function BulkAttendancePageClient({
  orgSlug,
  memberId,
}: Readonly<BulkAttendancePageClientProps>) {
  // ── Permissions ──────────────────────────────────────────────────────────────
  const { canCreate, canView, isLoading: permLoading } = useBulkAttendancePermissions(
    orgSlug,
    memberId,
  );

  // ── Data ─────────────────────────────────────────────────────────────────────
  const {
    currentWeekStart,
    dayMap,
    isLoading,
    isError,
    refetch,
    saveDayLogs,
    deleteDayEntry,
    optimisticUpdateDay,
    rollbackDay,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
    saveState,
    saveError,
  } = useBulkAttendanceData(orgSlug, memberId);

  // ── Holidays ─────────────────────────────────────────────────────────────────
  const currentYear = currentWeekStart.getFullYear();
  const { data: holidays = [] } = useHolidays(orgSlug, memberId, { year: currentYear });

  // ── Projects ─────────────────────────────────────────────────────────────────
  const { data: projects = [] } = useProjectsForAttendance(orgSlug, memberId);

  // ── Dialog state ─────────────────────────────────────────────────────────────
  const [dialogState, setDialogState] = useState<WorkLogDialogState>(CLOSED_DIALOG);
  const [isSavingDialog, setIsSavingDialog] = useState(false);

  // ── Open create dialog ───────────────────────────────────────────────────────
  const handleOpenCreate = useCallback((date: string, slotStart?: Date, slotEnd?: Date) => {
    // Use slot times if provided (from dragging on the grid), else default to 09:00–10:00
    let start: Date;
    let end: Date;
    if (slotStart) {
      start = slotStart;
      end = slotEnd ?? new Date(slotStart.getTime() + 60 * 60_000);
    } else {
      const [y, m, d] = date.split('-').map(Number);
      start = new Date(y!, m! - 1, d!, 9, 0, 0, 0);
      end = new Date(start.getTime() + 60 * 60_000);
    }
    setDialogState({
      open: true,
      mode: 'create',
      date,
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
  }, []);

  // ── Open edit dialog ─────────────────────────────────────────────────────────
  const handleOpenEdit = useCallback((date: string, log: LocalWorkLog) => {
    setDialogState({
      open: true,
      mode: 'edit',
      date,
      log,
    });
  }, []);

  // ── Close dialog ─────────────────────────────────────────────────────────────
  const handleCloseDialog = useCallback(() => {
    setDialogState(CLOSED_DIALOG);
  }, []);

  // ── Save from dialog ─────────────────────────────────────────────────────────
  const handleDialogSave = useCallback(
    async (date: string, values: WorkLogFormValues) => {
      setIsSavingDialog(true);

      // Snapshot BEFORE any optimistic update
      const currentDay = dayMap.get(date) ?? null;
      const snapshot = currentDay ? { ...currentDay, logs: [...(currentDay.logs ?? [])] } : null;
      const existingLogs = currentDay?.logs ?? [];

      // Build the new/updated log
      const newLog: LocalWorkLog = {
        id: dialogState.mode === 'edit' && dialogState.log ? dialogState.log.id : crypto.randomUUID(),
        startTime: values.startTime,
        endTime: values.endTime,
        projectId: values.projectId,
        projectTaskId: values.projectTaskId,
        title: dialogState.log?.title ?? null,
        notes: values.notes,
        isOptimistic: true,
      };

      // Compute final logs from the pre-optimistic snapshot
      let finalLogs: LocalWorkLog[];
      if (dialogState.mode === 'edit' && dialogState.log) {
        finalLogs = existingLogs.map((l) => (l.id === dialogState.log!.id ? newLog : l));
      } else {
        finalLogs = [...existingLogs, newLog];
      }
      finalLogs.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      // Optimistic update with the computed final state
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
        const msg = (err as { message?: string }).message ?? 'Failed to save work log';
        toast.error(msg);
      } finally {
        setIsSavingDialog(false);
      }
    },
    [dialogState, dayMap, optimisticUpdateDay, rollbackDay, saveDayLogs],
  );

  // ── Delete log ───────────────────────────────────────────────────────────────
  const handleDeleteLog = useCallback(
    async (date: string, logId: string) => {
      const currentDay = dayMap.get(date) ?? null;
      const snapshot = currentDay ? { ...currentDay, logs: [...(currentDay.logs ?? [])] } : null;

      const remainingLogs = (currentDay?.logs ?? []).filter((l) => l.id !== logId);

      // Optimistic removal
      optimisticUpdateDay(date, (prev) => ({
        date,
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
          // No logs left — delete the whole day
          await deleteDayEntry(date);
        } else {
          await saveDayLogs(date, remainingLogs);
        }
      } catch (err: unknown) {
        rollbackDay(date, snapshot);
        const msg = (err as { message?: string }).message ?? 'Failed to delete work log';
        toast.error(msg);
      }
    },
    [dayMap, optimisticUpdateDay, rollbackDay, saveDayLogs, deleteDayEntry],
  );

  // ── Drag log ─────────────────────────────────────────────────────────────────
  const handleDragLog = useCallback(
    async (
      sourceDate: string,
      logId: string,
      newStart: Date,
      newEnd: Date,
      targetDate: string,
    ) => {
      const isCrossDay = sourceDate !== targetDate;
      const sourceDay = dayMap.get(sourceDate) ?? null;
      const targetDay = dayMap.get(targetDate) ?? null;

      const sourceSnapshot = sourceDay ? { ...sourceDay, logs: [...(sourceDay.logs ?? [])] } : null;
      const targetSnapshot = targetDay ? { ...targetDay, logs: [...(targetDay.logs ?? [])] } : null;

      const movedLog: LocalWorkLog = {
        id: isCrossDay ? crypto.randomUUID() : logId,
        startTime: newStart,
        endTime: newEnd,
        projectId: sourceDay?.logs.find((l) => l.id === logId)?.projectId ?? null,
        projectTaskId: sourceDay?.logs.find((l) => l.id === logId)?.projectTaskId ?? null,
        title: sourceDay?.logs.find((l) => l.id === logId)?.title ?? null,
        notes: sourceDay?.logs.find((l) => l.id === logId)?.notes ?? null,
        isOptimistic: true,
      };

      // Optimistic update
      if (isCrossDay) {
        // Source: keep original (copy, not move)
        // Target: add new log
        optimisticUpdateDay(targetDate, (prev) => {
          const existingLogs = prev?.logs ?? [];
          const updatedLogs = [...existingLogs, movedLog].sort(
            (a, b) => a.startTime.getTime() - b.startTime.getTime(),
          );
          return {
            date: targetDate,
            attendanceRecordId: prev?.attendanceRecordId ?? null,
            clockIn: prev?.clockIn ?? null,
            clockOut: prev?.clockOut ?? null,
            totalHours: prev?.totalHours ?? null,
            overtimeHours: prev?.overtimeHours ?? null,
            status: prev?.status ?? null,
            logs: updatedLogs,
          };
        });
      } else {
        // Same day: update position
        optimisticUpdateDay(sourceDate, (prev) => {
          const updatedLogs = (prev?.logs ?? [])
            .map((l) => (l.id === logId ? movedLog : l))
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
          return {
            ...(prev ?? {
              date: sourceDate,
              attendanceRecordId: null,
              clockIn: null,
              clockOut: null,
              totalHours: null,
              overtimeHours: null,
              status: null,
            }),
            logs: updatedLogs,
          };
        });
      }

      try {
        if (isCrossDay) {
          // Save target day with new log added
          const targetLogs = [...(targetDay?.logs ?? []), movedLog].sort(
            (a, b) => a.startTime.getTime() - b.startTime.getTime(),
          );
          await saveDayLogs(targetDate, targetLogs);
        } else {
          // Save source day with updated log position
          const updatedLogs = (sourceDay?.logs ?? [])
            .map((l) => (l.id === logId ? movedLog : l))
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
          await saveDayLogs(sourceDate, updatedLogs);
        }
      } catch (err: unknown) {
        // Rollback
        rollbackDay(sourceDate, sourceSnapshot);
        if (isCrossDay) rollbackDay(targetDate, targetSnapshot);
        const msg = (err as { message?: string }).message ?? 'Failed to move work log';
        toast.error(msg);
      }
    },
    [dayMap, optimisticUpdateDay, rollbackDay, saveDayLogs],
  );

  // ── Permission loading ───────────────────────────────────────────────────────
  if (permLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-sm text-neutral-400">Loading…</span>
      </div>
    );
  }

  // ── Permission denied ────────────────────────────────────────────────────────
  if (!canCreate && !canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="size-12 rounded-full bg-destructive-bg flex items-center justify-center">
          <svg className="size-6 text-destructive-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-neutral-900">Access denied</p>
          <p className="text-xs text-neutral-500 mt-1">
            You don&apos;t have permission to use bulk attendance.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return <BulkAttendanceSkeleton />;
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <p className="text-sm font-medium text-neutral-900">Failed to load attendance data.</p>
        <p className="text-xs text-neutral-500">There was a problem fetching your work logs.</p>
        <button
          type="button"
          onClick={refetch}
          className="mt-1 text-sm font-medium bg-transparent border border-neutral-200 text-neutral-700 hover:bg-neutral-50 px-4 py-2 rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 flex-1 bg-canvas min-h-0 max-h-dvh overflow-hidden">
      {/* Header with nav */}
      <div className="flex items-center justify-between ml-7 mt-7 mr-7 shrink-0">
        <h1 className="text-4xl font-semibold text-neutral-900 tracking-tight">Timesheet</h1>
        <BulkAttendanceToolbar
          weekStart={currentWeekStart}
          onPrev={goToPrevWeek}
          onNext={goToNextWeek}
          onToday={goToCurrentWeek}
          saveState={saveState}
          saveError={saveError}
        />
      </div>

      {/* Card — fills remaining space, calendar scrolls internally */}
      <div className="mx-7 bg-surface border border-neutral-100 rounded-xl overflow-y-auto overflow-x-hidden overscroll-contain shadow-[var(--shadow-1)] flex-1 min-h-0">
        <BulkAttendanceCalendar
          weekStart={currentWeekStart}
          dayMap={dayMap}
          holidays={holidays}
          onOpenCreate={handleOpenCreate}
          onOpenEdit={handleOpenEdit}
          onDeleteLog={handleDeleteLog}
          onDragLog={handleDragLog}
        />
      </div>

      {/* Work log dialog */}
      <WorkLogDialog
        state={dialogState}
        projects={projects}
        onClose={handleCloseDialog}
        onSave={handleDialogSave}
        isPending={isSavingDialog}
      />
    </div>
  );
}
