'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { WorkLogForm } from './WorkLogForm';
import type { WorkLogFormValues } from './WorkLogForm';
import type { WorkLogDialogState } from '@/modules/attendance/types/bulkAttendanceTypes';
import type { ProjectForAttendance } from '@/modules/projects/types/projectTypes';
import { format, parseISO } from 'date-fns';

interface WorkLogDialogProps {
  state: WorkLogDialogState;
  projects?: ProjectForAttendance[];
  onClose: () => void;
  onSave: (date: string, values: WorkLogFormValues) => Promise<void>;
  isPending?: boolean;
}

function formatDialogDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr), 'EEEE, d MMMM yyyy');
  } catch {
    return dateStr ?? '';
  }
}

export function WorkLogDialog({
  state,
  projects = [],
  onClose,
  onSave,
  isPending = false,
}: Readonly<WorkLogDialogProps>) {
  const isCreate = state.mode === 'create';

  async function handleSubmit(values: WorkLogFormValues) {
    if (!state.date) return;
    await onSave(state.date, values);
    onClose();
  }

  return (
    <Dialog open={state.open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCreate ? 'Add work log' : 'Edit work log'}
          </DialogTitle>
          {state.date && (
            <DialogDescription>
              {formatDialogDate(state.date)}
            </DialogDescription>
          )}
        </DialogHeader>

        {state.date && (
          <WorkLogForm
            key={`${state.mode}-${state.date}-${state.log?.id ?? 'new'}`}
            date={state.date}
            initialLog={state.log}
            projects={projects}
            defaultStart={isCreate && state.log ? state.log.startTime : undefined}
            defaultEnd={isCreate && state.log ? state.log.endTime : undefined}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isPending={isPending}
            submitLabel={isCreate ? 'Add log' : 'Save changes'}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
