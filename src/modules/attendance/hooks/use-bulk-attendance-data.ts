'use client';

import { useCallback, useRef, useState } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import {
  useDeleteBulkAttendanceDayMutation,
  useUpsertBulkAttendanceMutation,
} from '@/modules/attendance/hooks/mutations/attendance';
import {
  attendanceQueryKeys,
  useBulkAttendanceRangeQuery,
} from '@/modules/attendance/hooks/queries/attendance';
import type {
  BulkDayState,
  LocalWorkLog,
  SaveState,
  BulkAttendanceDay,
  UpsertBulkAttendanceDayInput,
} from '@/modules/attendance/types/bulkAttendanceTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Serialize a Date to an ISO string that preserves the local date.
 * Sends the local timezone offset so the backend's date comparison
 * always matches the declared date field.
 *
 * Example (IST, UTC+5:30): 2026-05-05T09:00:00+05:30
 */
function toLocalISOString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const tzOffset = d.getTimezoneOffset(); // minutes, negative for UTC+
  const sign = tzOffset <= 0 ? '+' : '-';
  const absOffset = Math.abs(tzOffset);
  const offsetH = pad(Math.floor(absOffset / 60));
  const offsetM = pad(absOffset % 60);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
    `${sign}${offsetH}:${offsetM}`
  );
}

function dateToYMD(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function dateWithTime(dateStr: string, timeSource: Date): Date | null {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day || Number.isNaN(timeSource.getTime())) return null;
  return new Date(
    year,
    month - 1,
    day,
    timeSource.getHours(),
    timeSource.getMinutes(),
    timeSource.getSeconds(),
    timeSource.getMilliseconds(),
  );
}

function normalizeLogForDay(dateStr: string, log: LocalWorkLog): LocalWorkLog | null {
  const startTime = dateWithTime(dateStr, log.startTime);
  const rawEndTime = dateWithTime(dateStr, log.endTime);
  if (!startTime || !rawEndTime) return null;

  const endTime = rawEndTime > startTime
    ? rawEndTime
    : new Date(startTime.getTime() + 15 * 60_000);

  return {
    ...log,
    startTime,
    endTime,
  };
}

function parseDateSafe(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  try {
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso);
    return new Date(hasTimezone ? iso : `${iso}Z`);
  } catch {
    return null;
  }
}

function normalizeDayFromApi(day: BulkAttendanceDay): BulkDayState {
  return {
    date: day.date,
    attendanceRecordId: day.attendanceRecordId,
    clockIn: parseDateSafe(day.clockIn),
    clockOut: parseDateSafe(day.clockOut),
    totalHours: day.totalHours,
    overtimeHours: day.overtimeHours,
    status: day.status,
    logs: day.logs.map((l) => ({
      id: l.id,
      startTime: parseDateSafe(l.startTime) ?? new Date(l.startTime),
      endTime: parseDateSafe(l.endTime) ?? new Date(l.endTime),
      title: l.title ?? null,
      notes: l.notes ?? null,
      isOptimistic: false,
    })),
  };
}

function buildDayMap(days: BulkDayState[]): Map<string, BulkDayState> {
  const map = new Map<string, BulkDayState>();
  for (const d of days) map.set(d.date, d);
  return map;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseBulkAttendanceDataReturn {
  currentWeekStart: Date;
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  dayMap: Map<string, BulkDayState>;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  saveState: SaveState;
  saveError: string | null;
  saveDayLogs: (date: string, logs: LocalWorkLog[]) => Promise<void>;
  deleteDayEntry: (date: string) => Promise<void>;
  optimisticUpdateDay: (date: string, updater: (prev: BulkDayState | null) => BulkDayState) => void;
  rollbackDay: (date: string, snapshot: BulkDayState | null) => void;
}

export function useBulkAttendanceData(
  orgSlug: string,
  memberId: string,
): UseBulkAttendanceDataReturn {

  // ── Week state ───────────────────────────────────────────────────────────────
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 0 }),
  );

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
  const fromStr = dateToYMD(currentWeekStart);
  const toStr = dateToYMD(weekEnd);

  // ── Query ────────────────────────────────────────────────────────────────────
  const queryKey = attendanceQueryKeys.bulkAttendance(orgSlug, fromStr, toStr);

  const { data, isLoading, isError, refetch } = useBulkAttendanceRangeQuery(
    orgSlug,
    memberId,
    fromStr,
    toStr,
  );
  const upsertMutation = useUpsertBulkAttendanceMutation(orgSlug, memberId, queryKey);
  const deleteMutation = useDeleteBulkAttendanceDayMutation(orgSlug, memberId, queryKey);

  // ── Local optimistic state ───────────────────────────────────────────────────
  const [optimisticOverlay, setOptimisticOverlay] = useState<Map<string, BulkDayState | null>>(
    new Map(),
  );

  // Build effective day map: server data + optimistic overlay
  const serverDays = (data?.days ?? []).map(normalizeDayFromApi);
  const serverMap = buildDayMap(serverDays);

  const dayMap = new Map<string, BulkDayState>();
  for (const [date, day] of serverMap) dayMap.set(date, day);
  for (const [date, day] of optimisticOverlay) {
    if (day === null) {
      dayMap.delete(date);
    } else {
      dayMap.set(date, day);
    }
  }

  // ── Save state ───────────────────────────────────────────────────────────────
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function markSaving() {
    setSaveState('saving');
    setSaveError(null);
  }

  function markSaved() {
    setSaveState('saved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveState('idle'), 2000);
  }

  function markError(msg: string) {
    setSaveState('error');
    setSaveError(msg);
  }

  // ── Optimistic helpers ───────────────────────────────────────────────────────
  const optimisticUpdateDay = useCallback(
    (date: string, updater: (prev: BulkDayState | null) => BulkDayState) => {
      setOptimisticOverlay((prev) => {
        const next = new Map(prev);
        const current = next.get(date) ?? serverMap.get(date) ?? null;
        next.set(date, updater(current));
        return next;
      });
    },
    [serverMap],
  );

  const rollbackDay = useCallback((date: string, snapshot: BulkDayState | null) => {
    setOptimisticOverlay((prev) => {
      const next = new Map(prev);
      if (snapshot === null) {
        next.delete(date);
      } else {
        next.set(date, snapshot);
      }
      return next;
    });
  }, []);

  // ── Save day logs ────────────────────────────────────────────────────────────
  const saveDayLogs = useCallback(
    async (date: string, logs: LocalWorkLog[]) => {
      markSaving();
      const normalizedLogs = logs
        .map((log) => normalizeLogForDay(date, log))
        .filter((log): log is LocalWorkLog => log !== null);

      const dayInput: UpsertBulkAttendanceDayInput = {
        date,
        logs: normalizedLogs.map((l) => ({
          startTime: toLocalISOString(l.startTime),
          endTime: toLocalISOString(l.endTime),
          title: l.title ?? undefined,
          notes: l.notes ?? undefined,
        })),
      };

      try {
        const result = await upsertMutation.mutateAsync({ days: [dayInput] });

        // Reconcile with server response
        const savedDay = result.days[0];
        if (savedDay) {
          setOptimisticOverlay((prev) => {
            const next = new Map(prev);
            next.set(date, normalizeDayFromApi(savedDay));
            return next;
          });
        }

        markSaved();
      } catch (err: unknown) {
        const msg = (err as { message?: string }).message ?? 'Failed to save attendance';
        markError(msg);
        throw err;
      }
    },
    [upsertMutation],
  );

  // ── Delete day ───────────────────────────────────────────────────────────────
  const deleteDayEntry = useCallback(
    async (date: string) => {
      markSaving();
      try {
        await deleteMutation.mutateAsync(date);
        setOptimisticOverlay((prev) => {
          const next = new Map(prev);
          // null signals deletion in the overlay
          next.set(date, null as unknown as BulkDayState);
          return next;
        });
        markSaved();
      } catch (err: unknown) {
        const msg = (err as { message?: string }).message ?? 'Failed to delete attendance';
        markError(msg);
        throw err;
      }
    },
    [deleteMutation],
  );

  // ── Week navigation ──────────────────────────────────────────────────────────
  const goToPrevWeek = useCallback(() => {
    setCurrentWeekStart((w) => subWeeks(w, 1));
    setOptimisticOverlay(new Map());
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentWeekStart((w) => addWeeks(w, 1));
    setOptimisticOverlay(new Map());
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
    setOptimisticOverlay(new Map());
  }, []);

  return {
    currentWeekStart,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
    dayMap,
    isLoading,
    isError,
    refetch,
    saveState,
    saveError,
    saveDayLogs,
    deleteDayEntry,
    optimisticUpdateDay,
    rollbackDay,
  };
}
