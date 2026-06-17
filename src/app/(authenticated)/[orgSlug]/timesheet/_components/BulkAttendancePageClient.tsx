'use client';

import { useCallback, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';

import { BulkAttendanceCalendar } from './BulkAttendanceCalendar';
import { BulkAttendanceSkeleton } from './BulkAttendanceSkeleton';
import { BulkAttendanceToolbar } from './BulkAttendanceToolbar';
import { WorkLogDirectorySection } from './WorkLogDirectorySection';
import { WorkLogDialog } from './WorkLogDialog';
import type { WorkLogFormValues } from './WorkLogForm';

import { useBulkAttendancePermissions } from '@/modules/attendance/hooks/queries/attendance';
import { useBulkAttendanceData } from '@/modules/attendance/hooks/use-bulk-attendance-data';
import { splitWorkdayMinutes } from '@/modules/attendance/hooks/use-duration-parser';
import type { BulkDayState, LocalWorkLog, WorkLogDialogState } from '@/modules/attendance/types/bulkAttendanceTypes';
import { useHolidays } from '@/modules/leave/hooks/useHolidays';
import { useLeaveRequests } from '@/modules/leave/hooks/useLeaveRequests';
import { useProjectsForAttendance } from '@/modules/projects/hooks/useProjectsForAttendance';

const CLOSED_DIALOG: WorkLogDialogState = {
  open: false,
  mode: 'create',
  date: null,
  log: null,
};

interface BulkAttendancePageClientProps {
  orgSlug: string;
  memberId: string;
}

function buildOptimisticDay(
  date: string,
  currentDay: BulkDayState | null,
  logs: LocalWorkLog[],
): BulkDayState {
  return {
    date,
    attendanceRecordId: currentDay?.attendanceRecordId ?? null,
    clockIn: currentDay?.clockIn ?? null,
    clockOut: currentDay?.clockOut ?? null,
    totalHours: currentDay?.totalHours ?? null,
    overtimeHours: currentDay?.overtimeHours ?? null,
    status: currentDay?.status ?? null,
    logs,
  };
}

function sortedLogs(logs: LocalWorkLog[]): LocalWorkLog[] {
  return [...logs].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

export function BulkAttendancePageClient({
  orgSlug,
  memberId,
}: Readonly<BulkAttendancePageClientProps>) {
  const [dialogState, setDialogState] = useState<WorkLogDialogState>(CLOSED_DIALOG);
  const [isSavingDialog, setIsSavingDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'entries'>('calendar');

  const { canCreate, canView, isLoading: permLoading, permissions } = useBulkAttendancePermissions(
    orgSlug,
    memberId,
  );

  const {
    currentWeekStart,
    dayMap,
    isLoading,
    isError,
    refetch,
    saveDayLogs,
    saveMultipleDayLogs,
    deleteDayEntry,
    optimisticUpdateDay,
    rollbackDay,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
    saveState,
    saveError,
  } = useBulkAttendanceData(orgSlug, memberId);

  const currentYear = currentWeekStart.getFullYear();
  const { data: holidays = [] } = useHolidays(orgSlug, memberId, { year: currentYear });
  const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
  const weekEndDate = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
  const { data: leaveData } = useLeaveRequests(orgSlug, memberId, {
    status: 'APPROVED',
    memberId,
    fromDate: weekStartDate,
    toDate: weekEndDate,
    page: 1,
    pageSize: 50,
  });
  const { data: projects = [] } = useProjectsForAttendance(orgSlug, memberId);

  const totalHoursLogged = useMemo(() => {
    let totalMins = 0;
    for (const day of dayMap.values()) {
      for (const log of day.logs) {
        const diff = log.endTime.getTime() - log.startTime.getTime();
        totalMins += Math.round(diff / 60_000);
      }
    }
    return totalMins / 60;
  }, [dayMap]);

  const handleOpenCreate = useCallback((date: string, slotStart?: Date, slotEnd?: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(date + "T00:00:00") > today) return;
    let start: Date;
    let end: Date;

    if (slotStart) {
      start = slotStart;
      end = slotEnd ?? new Date(slotStart.getTime() + 60 * 60_000);
    } else {
      const [year, month, day] = date.split('-').map(Number);
      start = new Date(year!, month! - 1, day!, 9, 0, 0, 0);
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

  const handleOpenEdit = useCallback((date: string, log: LocalWorkLog) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(date + "T00:00:00") > today) return;
    setDialogState({
      open: true,
      mode: 'edit',
      date,
      log,
    });
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogState(CLOSED_DIALOG);
  }, []);

  const handleDialogSave = useCallback(
    async (date: string, values: WorkLogFormValues) => {
      setIsSavingDialog(true);

      const nextLogsByDate = new Map<string, LocalWorkLog[]>();
      const snapshots = new Map<string, BulkDayState | null>();
      const getSnapshot = (targetDate: string) => {
        if (!snapshots.has(targetDate)) {
          const currentDay = dayMap.get(targetDate) ?? null;
          snapshots.set(
            targetDate,
            currentDay ? { ...currentDay, logs: [...(currentDay.logs ?? [])] } : null,
          );
        }
        return snapshots.get(targetDate) ?? null;
      };
      const getLogsForDate = (targetDate: string) => {
        const existing = nextLogsByDate.get(targetDate);
        if (existing) return existing;

        const currentLogs = [...(dayMap.get(targetDate)?.logs ?? [])];
        nextLogsByDate.set(targetDate, currentLogs);
        getSnapshot(targetDate);
        return currentLogs;
      };

      if (dialogState.mode === 'edit' && dialogState.log) {
        const logs = getLogsForDate(date).filter((log) => log.id !== dialogState.log!.id);
        nextLogsByDate.set(date, logs);
      }

      const title = dialogState.log?.title ?? null;
      const baseLog = {
        projectId: values.projectId,
        projectTaskId: values.projectTaskId,
        title,
        notes: values.notes,
        isOptimistic: true,
      };

      if (values.durationUnit === 'day') {
        const segments = splitWorkdayMinutes(values.startTime, values.durationMinutes);
        segments.forEach((segment, index) => {
          const segmentLog: LocalWorkLog = {
            ...baseLog,
            id: dialogState.mode === 'edit' && index === 0 && dialogState.log
              ? dialogState.log.id
              : crypto.randomUUID(),
            startTime: segment.startTime,
            endTime: segment.endTime,
          };
          nextLogsByDate.set(segment.date, [...getLogsForDate(segment.date), segmentLog]);
        });
      } else {
        const newLog: LocalWorkLog = {
          ...baseLog,
          id: dialogState.mode === 'edit' && dialogState.log ? dialogState.log.id : crypto.randomUUID(),
          startTime: values.startTime,
          endTime: values.endTime,
        };
        nextLogsByDate.set(date, [...getLogsForDate(date), newLog]);
      }

      for (const [targetDate, logs] of nextLogsByDate) {
        const finalLogs = sortedLogs(logs);
        nextLogsByDate.set(targetDate, finalLogs);
        optimisticUpdateDay(targetDate, () => buildOptimisticDay(
          targetDate,
          dayMap.get(targetDate) ?? null,
          finalLogs,
        ));
      }

      try {
        await saveMultipleDayLogs(nextLogsByDate);
        setDialogState(CLOSED_DIALOG);
      } catch (error: unknown) {
        for (const [targetDate, snapshot] of snapshots) {
          rollbackDay(targetDate, snapshot);
        }
        const message = (error as { message?: string }).message ?? 'Failed to save work log';
        toast.error(message);
      } finally {
        setIsSavingDialog(false);
      }
    },
    [dayMap, dialogState, optimisticUpdateDay, rollbackDay, saveMultipleDayLogs],
  );

  const handleDeleteLog = useCallback(
    async (date: string, logId: string) => {
      const currentDay = dayMap.get(date) ?? null;
      const snapshot = currentDay ? { ...currentDay, logs: [...(currentDay.logs ?? [])] } : null;
      const remainingLogs = (currentDay?.logs ?? []).filter((log) => log.id !== logId);

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
          await deleteDayEntry(date);
        } else {
          await saveDayLogs(date, remainingLogs);
        }
      } catch (error: unknown) {
        rollbackDay(date, snapshot);
        const message = (error as { message?: string }).message ?? 'Failed to delete work log';
        toast.error(message);
      }
    },
    [dayMap, deleteDayEntry, optimisticUpdateDay, rollbackDay, saveDayLogs],
  );

  const handleDragLog = useCallback(
    async (sourceDate: string, logId: string, newStart: Date, newEnd: Date, targetDate: string) => {
      const isCrossDay = sourceDate !== targetDate;
      const sourceDay = dayMap.get(sourceDate) ?? null;
      const targetDay = dayMap.get(targetDate) ?? null;

      const sourceSnapshot = sourceDay ? { ...sourceDay, logs: [...(sourceDay.logs ?? [])] } : null;
      const targetSnapshot = targetDay ? { ...targetDay, logs: [...(targetDay.logs ?? [])] } : null;
      const sourceLog = sourceDay?.logs.find((log) => log.id === logId);

      const movedLog: LocalWorkLog = {
        id: isCrossDay ? crypto.randomUUID() : logId,
        startTime: newStart,
        endTime: newEnd,
        projectId: sourceLog?.projectId ?? null,
        projectTaskId: sourceLog?.projectTaskId ?? null,
        title: sourceLog?.title ?? null,
        notes: sourceLog?.notes ?? null,
        isOptimistic: true,
      };

      if (isCrossDay) {
        optimisticUpdateDay(targetDate, (prev) => {
          const updatedLogs = [...(prev?.logs ?? []), movedLog].sort(
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
        optimisticUpdateDay(sourceDate, (prev) => {
          const updatedLogs = (prev?.logs ?? [])
            .map((log) => (log.id === logId ? movedLog : log))
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
          const targetLogs = [...(targetDay?.logs ?? []), movedLog].sort(
            (a, b) => a.startTime.getTime() - b.startTime.getTime(),
          );
          await saveDayLogs(targetDate, targetLogs);
        } else {
          const updatedLogs = (sourceDay?.logs ?? [])
            .map((log) => (log.id === logId ? movedLog : log))
            .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
          await saveDayLogs(sourceDate, updatedLogs);
        }
      } catch (error: unknown) {
        rollbackDay(sourceDate, sourceSnapshot);
        if (isCrossDay) rollbackDay(targetDate, targetSnapshot);
        const message = (error as { message?: string }).message ?? 'Failed to move work log';
        toast.error(message);
      }
    },
    [dayMap, optimisticUpdateDay, rollbackDay, saveDayLogs],
  );

  if (permLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!canCreate && !canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <svg className="size-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Access denied</p>
          <p className="mt-1 text-xs text-muted-foreground">You do not have permission to use bulk attendance.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <BulkAttendanceSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16">
        <p className="text-sm font-medium text-foreground">Failed to load attendance data.</p>
        <p className="text-xs text-muted-foreground">There was a problem fetching your work logs.</p>
        <button
          type="button"
          onClick={refetch}
          className="mt-1 rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Retry
        </button>
      </div>
    );
  }

  const showTimesheetEntryToggle = permissions.view === 'organization';

  return (
    <div className="flex max-h-dvh min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* redrawn page-level header with redesigned toolbar */}
      <BulkAttendanceToolbar
        weekStart={currentWeekStart}
        onPrev={goToPrevWeek}
        onNext={goToNextWeek}
        onToday={goToCurrentWeek}
        saveState={saveState}
        saveError={saveError}
        showTimesheetEntryToggle={showTimesheetEntryToggle}
        onTimesheetToggle={() => setViewMode('calendar')}
        totalHoursLogged={totalHoursLogged}
        totalHoursTarget={40}
      />

      {viewMode === 'entries' ? (
        <WorkLogDirectorySection orgSlug={orgSlug} memberId={memberId} />
      ) : (
        <div className="mx-7 mb-7 min-h-0 flex-1 overflow-x-auto overflow-y-auto border border-border bg-card shadow-sm rounded-none">
          <BulkAttendanceCalendar
            weekStart={currentWeekStart}
            dayMap={dayMap}
            holidays={holidays}
            leaveRequests={leaveData?.items ?? []}
            onOpenCreate={handleOpenCreate}
            onOpenEdit={handleOpenEdit}
            onDeleteLog={handleDeleteLog}
            onDragLog={handleDragLog}
            projects={projects}
          />
        </div>
      )}

      <WorkLogDialog
        state={dialogState}
        projects={projects}
        onClose={handleCloseDialog}
        onSave={handleDialogSave}
        allowDayDuration
        isPending={isSavingDialog}
      />
    </div>
  );
}
