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
import { format, parseISO } from 'date-fns';

interface WorkLogDialogProps {
  state: WorkLogDialogState;
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
      <DialogContent className="max-w-sm border-hairline bg-surface rounded-lg shadow-2">
        <DialogHeader className="px-0 pt-0">
          <DialogTitle className="text-[21px] font-semibold tracking-tight text-ink">
            {isCreate ? 'Add work log' : 'Edit work log'}
          </DialogTitle>
          {state.date && (
            <DialogDescription className="text-[14px] font-medium text-ink-muted-48">
              {formatDialogDate(state.date)}
            </DialogDescription>
          )}
        </DialogHeader>

        {state.date && (
          <WorkLogForm
            key={`${state.mode}-${state.date}-${state.log?.id ?? 'new'}`}
            date={state.date}
            initialLog={state.log}
            // Pass slot times as defaults when creating from a dragged selection
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
