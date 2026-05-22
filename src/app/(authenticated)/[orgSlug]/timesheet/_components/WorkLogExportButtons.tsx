'use client';

import { useState } from 'react';
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { exportWorkLogReportsAction } from '@/modules/attendance/hooks/queries/workLogReports';
import type { WorkLogReportFilters } from '@/modules/attendance/types/workLogReportTypes';

interface WorkLogExportButtonsProps {
  orgSlug: string;
  memberId: string;
  filters: WorkLogReportFilters;
  disabled?: boolean;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function WorkLogExportButtons({
  orgSlug,
  memberId,
  filters,
  disabled = false,
}: Readonly<WorkLogExportButtonsProps>) {
  const [pending, setPending] = useState<'csv' | 'xlsx' | null>(null);

  async function handleExport(format: 'csv' | 'xlsx') {
    if (disabled || pending) return;
    setPending(format);
    try {
      const blob = await exportWorkLogReportsAction({ orgSlug, memberId, format, filters });
      triggerDownload(blob, `work-log-report.${format}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={() => handleExport('csv')} disabled={disabled || pending !== null}>
        {pending === 'csv' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileDown className="mr-2 size-4" />}
        Generate CSV
      </Button>
      <Button type="button" variant="outline" onClick={() => handleExport('xlsx')} disabled={disabled || pending !== null}>
        {pending === 'xlsx' ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileSpreadsheet className="mr-2 size-4" />}
        Generate Excel
      </Button>
    </div>
  );
}
