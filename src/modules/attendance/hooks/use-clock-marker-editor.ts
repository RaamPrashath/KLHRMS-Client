'use client';

import { useCallback } from 'react';
import type { BulkDayState } from '@/modules/attendance/types/bulkAttendanceTypes';

export interface UseClockMarkerEditorReturn {
  dragClockMarker: (
    date: string,
    type: 'clock-in' | 'clock-out',
    newTime: Date,
    currentDay: BulkDayState | null,
    onSave: (date: string, updatedDay: BulkDayState) => Promise<void>,
    onOptimisticUpdate: (date: string, updater: (prev: BulkDayState | null) => BulkDayState) => void,
    onRollback: (date: string, snapshot: BulkDayState | null) => void,
  ) => Promise<void>;
}

export function useClockMarkerEditor(): UseClockMarkerEditorReturn {
  const dragClockMarker = useCallback(
    async (
      date: string,
      type: 'clock-in' | 'clock-out',
      newTime: Date,
      currentDay: BulkDayState | null,
      onSave: (date: string, updatedDay: BulkDayState) => Promise<void>,
      onOptimisticUpdate: (date: string, updater: (prev: BulkDayState | null) => BulkDayState) => void,
      onRollback: (date: string, snapshot: BulkDayState | null) => void,
    ) => {
      if (!currentDay) return;

      const snapshot = { ...currentDay };

      // Optimistic update
      onOptimisticUpdate(date, (prev) => {
        if (!prev) return currentDay;
        return {
          ...prev,
          clockIn: type === 'clock-in' ? newTime : prev.clockIn,
          clockOut: type === 'clock-out' ? newTime : prev.clockOut,
        };
      });

      try {
        const updatedDay: BulkDayState = {
          ...currentDay,
          clockIn: type === 'clock-in' ? newTime : currentDay.clockIn,
          clockOut: type === 'clock-out' ? newTime : currentDay.clockOut,
        };
        await onSave(date, updatedDay);
      } catch {
        onRollback(date, snapshot);
      }
    },
    [],
  );

  return { dragClockMarker };
}
