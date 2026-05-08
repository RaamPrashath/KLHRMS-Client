'use client';

import { useState, useCallback } from 'react';
import type { LocalWorkLog, WorkLogDialogState } from '@/modules/attendance/types/bulkAttendanceTypes';

export interface UseWorkLogEditorReturn {
  dialogState: WorkLogDialogState;
  openCreateDialog: (date: string, defaultStart?: Date) => void;
  openEditDialog: (date: string, log: LocalWorkLog) => void;
  closeDialog: () => void;
  createLog: (date: string, startTime: Date, endTime: Date, notes: string | null) => LocalWorkLog;
  updateLog: (log: LocalWorkLog, startTime: Date, endTime: Date, notes: string | null) => LocalWorkLog;
}

const CLOSED_STATE: WorkLogDialogState = {
  open: false,
  mode: 'create',
  date: null,
  log: null,
};

export function useWorkLogEditor(): UseWorkLogEditorReturn {
  const [dialogState, setDialogState] = useState<WorkLogDialogState>(CLOSED_STATE);

  const openCreateDialog = useCallback((date: string, defaultStart?: Date) => {
    // Default start: 09:00 on the given date
    const start = defaultStart ?? (() => {
      const d = new Date(date + 'T09:00:00');
      return d;
    })();

    const end = new Date(start.getTime() + 60 * 60_000); // +1 hour

    setDialogState({
      open: true,
      mode: 'create',
      date,
      log: {
        id: crypto.randomUUID(),
        startTime: start,
        endTime: end,
        title: null,
        notes: null,
        isOptimistic: true,
      },
    });
  }, []);

  const openEditDialog = useCallback((date: string, log: LocalWorkLog) => {
    setDialogState({
      open: true,
      mode: 'edit',
      date,
      log,
    });
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState(CLOSED_STATE);
  }, []);

  const createLog = useCallback(
    (date: string, startTime: Date, endTime: Date, notes: string | null): LocalWorkLog => {
      void date;
      return {
        id: crypto.randomUUID(),
        startTime,
        endTime,
        title: null,
        notes,
        isOptimistic: true,
      };
    },
    [],
  );

  const updateLog = useCallback(
    (log: LocalWorkLog, startTime: Date, endTime: Date, notes: string | null): LocalWorkLog => {
      return {
        ...log,
        startTime,
        endTime,
        notes,
        isOptimistic: true,
      };
    },
    [],
  );

  return {
    dialogState,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    createLog,
    updateLog,
  };
}
