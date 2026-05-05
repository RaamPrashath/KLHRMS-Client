'use client';

import { useState, useEffect, useRef } from 'react';
import { useClockInMutation } from '@/modules/attendance/hooks/useClockInMutation';
import { useClockOutMutation } from '@/modules/attendance/hooks/useClockOutMutation';
import {
  formatElapsed,
  formatTime,
  formatWorkedDuration,
  formatTodayLabel,
  getTodayIST,
} from '@/modules/attendance/utils/attendanceFormatters';
import { ClockInButton } from '@/modules/attendance/components/ClockInButton';
import { ClockOutButton } from '@/modules/attendance/components/ClockOutButton';
import type { AttendanceRecord, ApiError } from '@/modules/attendance/types/attendanceTypes';

// ─── Widget states ────────────────────────────────────────────────────────────
// NOT_CLOCKED_IN  — no record for today, or record has no clockIn
// CLOCKED_IN      — active session (clockIn set, clockOut null)
// COMPLETED       — session finished today (clockIn + clockOut both set)
// OTHER_DAY       — latest record is from a previous day (show clock-in)

type WidgetState = 'NOT_CLOCKED_IN' | 'CLOCKED_IN' | 'COMPLETED';

interface ClockWidgetProps {
  orgSlug: string;
  memberId: string;
  initialRecord: AttendanceRecord | null;
}

/**
 * Derive the widget state from the latest attendance record.
 * "Today" is determined in IST so the boundary is correct for Indian users.
 */
function deriveWidgetState(record: AttendanceRecord | null): WidgetState {
  if (!record) return 'NOT_CLOCKED_IN';

  const todayIST = getTodayIST(); // "YYYY-MM-DD" in Asia/Kolkata

  // Record is from a previous day — treat as not clocked in today
  if (record.date !== todayIST) return 'NOT_CLOCKED_IN';

  if (record.clockIn != null && record.clockOut == null) return 'CLOCKED_IN';
  if (record.clockIn != null && record.clockOut != null) return 'COMPLETED';

  return 'NOT_CLOCKED_IN';
}

export function ClockWidget({
  orgSlug,
  memberId,
  initialRecord,
}: Readonly<ClockWidgetProps>) {
  const [widgetState, setWidgetState] = useState<WidgetState>(() =>
    deriveWidgetState(initialRecord),
  );

  // ISO string of the active clock-in — used only for elapsed timer math
  const [activeClockIn, setActiveClockIn] = useState<string | null>(() => {
    if (!initialRecord) return null;
    const todayIST = getTodayIST();
    if (
      initialRecord.date === todayIST &&
      initialRecord.clockIn != null &&
      initialRecord.clockOut == null
    ) {
      return initialRecord.clockIn;
    }
    return null;
  });

  // Completed session data — shown in COMPLETED state
  const [completedRecord, setCompletedRecord] = useState<AttendanceRecord | null>(() => {
    if (!initialRecord) return null;
    const todayIST = getTodayIST();
    if (
      initialRecord.date === todayIST &&
      initialRecord.clockIn != null &&
      initialRecord.clockOut != null
    ) {
      return initialRecord;
    }
    return null;
  });

  // Live elapsed display — updated every second, pure ms arithmetic
  const [elapsedDisplay, setElapsedDisplay] = useState<string>('00:00:00');
  const [inlineError, setInlineError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clockInMutation = useClockInMutation(orgSlug, memberId);
  const clockOutMutation = useClockOutMutation(orgSlug, memberId);

  // ── Elapsed timer ────────────────────────────────────────────────────────────
  // Only runs when CLOCKED_IN. Uses raw ms diff — timezone has no effect here.
  useEffect(() => {
    if (widgetState === 'CLOCKED_IN' && activeClockIn) {
      // Set immediately so there's no 1-second blank
      setElapsedDisplay(formatElapsed(activeClockIn));
      intervalRef.current = setInterval(() => {
        setElapsedDisplay(formatElapsed(activeClockIn));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [widgetState, activeClockIn]);

  // ── Clock-in handler ─────────────────────────────────────────────────────────
  function handleClockIn() {
    setInlineError(null);
    clockInMutation
      .mutateAsync({})
      .then((record) => {
        setWidgetState('CLOCKED_IN');
        setActiveClockIn(record.clockIn);
        setElapsedDisplay('00:00:00');
        setInlineError(null);
      })
      .catch((err: unknown) => {
        const apiErr = err as ApiError;
        setInlineError(apiErr.message ?? 'Clock-in failed.');
        // If already clocked in (409/400), keep NOT_CLOCKED_IN state so button stays visible
      });
  }

  // ── Clock-out handler ────────────────────────────────────────────────────────
  function handleClockOut() {
    setInlineError(null);
    clockOutMutation
      .mutateAsync({})
      .then((records) => {
        // Backend returns an array (may be split across midnight)
        const todayIST = getTodayIST();
        const todayRecord = records.find((r) => r.date === todayIST) ?? records[0] ?? null;
        setWidgetState('COMPLETED');
        setActiveClockIn(null);
        setCompletedRecord(todayRecord);
        setInlineError(null);
      })
      .catch((err: unknown) => {
        const apiErr = err as ApiError;
        const msg = apiErr.message ?? 'Clock-out failed.';
        setInlineError(msg);
        // No active session — revert to not-clocked-in
        if (msg.includes('No active clock-in session found')) {
          setWidgetState('NOT_CLOCKED_IN');
          setActiveClockIn(null);
        }
        // "clock_out must be after clock_in" — keep CLOCKED_IN state
      });
  }

  const todayLabel = formatTodayLabel();

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="bg-surface border border-neutral-100 rounded-xl shadow-(--shadow-1) p-6">
      <p className="text-sm text-neutral-500 mb-4">{todayLabel}</p>

      {/* State A: Not clocked in */}
      {widgetState === 'NOT_CLOCKED_IN' && (
        <div className="flex items-center gap-3">
          <ClockInButton onClockIn={handleClockIn} isPending={clockInMutation.isPending} />
        </div>
      )}

      {/* State B: Currently clocked in */}
      {widgetState === 'CLOCKED_IN' && (
        <div className="flex flex-col gap-4">
          <p className="font-mono text-2xl font-semibold text-neutral-900" aria-live="polite" aria-label="Elapsed work time">
            {elapsedDisplay}
          </p>
          <div className="flex items-center gap-3">
            <ClockOutButton onClockOut={handleClockOut} isPending={clockOutMutation.isPending} />
          </div>
        </div>
      )}

      {/* State C: Completed — read-only summary, no clock-in button */}
      {widgetState === 'COMPLETED' && completedRecord && (
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-bg text-success-text text-xs font-medium w-fit">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
              <path d="M8.5 2.5L4 7.5 1.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            Day complete
          </div>
          <div className="grid grid-cols-3 gap-4 mt-1">
            <div>
              <p className="text-xs text-neutral-500 mb-0.5">Worked</p>
              <p className="font-mono text-sm font-semibold text-neutral-900">
                {formatWorkedDuration(completedRecord.totalHours)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-0.5">Clock In</p>
              <p className="font-mono text-sm font-semibold text-neutral-900">
                {formatTime(completedRecord.clockIn)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 mb-0.5">Clock Out</p>
              <p className="font-mono text-sm font-semibold text-neutral-900">
                {formatTime(completedRecord.clockOut)}
              </p>
            </div>
          </div>
        </div>
      )}

      {inlineError && (
        <p className="text-xs text-destructive-text mt-3" role="alert">
          {inlineError}
        </p>
      )}
    </div>
  );
}
