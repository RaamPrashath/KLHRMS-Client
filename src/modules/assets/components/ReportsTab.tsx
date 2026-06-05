'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileType2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { REPORT_GROUPS, REPORT_TYPE_ICONS } from '@/modules/assets/lib/assetConfig';
import {
  base64ToBlob,
  humanize,
  readError,
  reportDescriptions,
} from '@/modules/assets/lib/assetUtils';
import {
  exportAssetsCsvAction,
  exportAssetsPdfAction,
  exportAssetsXlsxAction,
} from '@/modules/assets/api/assetServerActions';
import type {
  AssetLookupOption,
  AssetReportType,
} from '@/modules/assets/types/assetTypes';

type ReportFormat = 'xlsx' | 'csv' | 'pdf';

const FORMAT_OPTIONS: { value: ReportFormat; label: string; icon: typeof Download }[] = [
  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', icon: FileText },
  { value: 'pdf', label: 'PDF', icon: FileType2 },
];

export function ReportsTab({
  orgSlug,
  memberId,
  members,
}: {
  orgSlug: string;
  memberId: string;
  members: AssetLookupOption[];
}) {
  const [reportFormats, setReportFormats] = useState<Record<string, ReportFormat>>({});
  const [reportEmployeeFilter, setReportEmployeeFilter] = useState<string>('');
  const [exporting, setExporting] = useState<Record<string, boolean>>({});

  async function handleExportReport(
    reportType: AssetReportType,
    format: ReportFormat = 'xlsx',
  ) {
    const key = `${reportType}-${format}`;
    setExporting((p) => ({ ...p, [key]: true }));
    try {
      if (format === 'csv') {
        const csv = await exportAssetsCsvAction({
          orgSlug,
          memberId,
          reportType,
          memberIdFilter:
            reportType === 'EMPLOYEE_ASSET_REPORT' ? reportEmployeeFilter || undefined : undefined,
        });
        triggerDownload(
          new Blob([csv], { type: 'text/csv;charset=utf-8' }),
          `${reportType.toLowerCase()}-${dateStamp()}.csv`,
        );
        toast.success('CSV downloaded');
      } else if (format === 'xlsx') {
        const xlsx = await exportAssetsXlsxAction({
          orgSlug,
          memberId,
          reportType,
          memberIdFilter:
            reportType === 'EMPLOYEE_ASSET_REPORT' ? reportEmployeeFilter || undefined : undefined,
        });
        const blob = base64ToBlob(
          xlsx.base64,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        triggerDownload(blob, xlsx.fileName);
        toast.success('Excel file downloaded');
      } else {
        const pdf = await exportAssetsPdfAction({
          orgSlug,
          memberId,
          reportType,
          memberIdFilter:
            reportType === 'EMPLOYEE_ASSET_REPORT' ? reportEmployeeFilter || undefined : undefined,
        });
        const blob = base64ToBlob(pdf.base64, 'application/pdf');
        triggerDownload(blob, pdf.fileName);
        toast.success('PDF downloaded');
      }
    } catch (error) {
      toast.error(readError(error, 'Failed to export report'));
    } finally {
      setExporting((p) => ({ ...p, [key]: false }));
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {REPORT_GROUPS.map((group) => {
        const GroupIcon = group.icon;
        return (
          <div
            key={group.label}
            className="overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-white shadow-[0_1px_0_rgba(17,24,39,0.03)]"
          >
            <div className="flex items-center gap-2.5 border-b border-[#e5e7eb] bg-[#f7f8fa] px-4 py-3">
              <GroupIcon className="size-4 text-[#6b7280]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                {group.label}
              </span>
            </div>
            <div className="divide-y divide-[#eef0f3]">
              {group.types.map((reportType) => {
                const ReportIcon = REPORT_TYPE_ICONS[reportType];
                const format: ReportFormat = reportFormats[reportType] || 'xlsx';
                const isEmployeeReport = reportType === 'EMPLOYEE_ASSET_REPORT';
                const isLoading = !!exporting[`${reportType}-${format}`];
                return (
                  <div key={reportType} className="px-4 py-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#f8f9fc] text-[#6b7280] shadow-[inset_0_0_0_1px_#e5e7eb]">
                        <ReportIcon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-medium text-[#111827]">
                          {humanize(reportType)}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-4 text-[#6b7280]">
                          {reportDescriptions(reportType)}
                        </p>
                      </div>
                    </div>

                    {isEmployeeReport && (
                      <div className="mt-3">
                        <select
                          value={reportEmployeeFilter}
                          onChange={(e) => setReportEmployeeFilter(e.target.value)}
                          className="w-full h-9 rounded-xl border border-[#e5e7eb] bg-white px-3 text-[13px] text-[#111827] outline-none"
                        >
                          <option value="">Select an employee...</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      {FORMAT_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        const active = format === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              setReportFormats((p) => ({ ...p, [reportType]: opt.value }))
                            }
                            className={
                              'flex h-8 items-center justify-center gap-1.5 rounded-lg border text-[12px] font-medium transition-colors ' +
                              (active
                                ? 'border-[#111827] bg-[#111827] text-white'
                                : 'border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#d1d5db] hover:text-[#111827]')
                            }
                            aria-pressed={active}
                          >
                            <Icon className="size-3.5" />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      disabled={(isEmployeeReport && !reportEmployeeFilter) || isLoading}
                      className="mt-2 h-9 w-full rounded-xl border border-[#e5e7eb] text-[13px]"
                      onClick={() => void handleExportReport(reportType, format)}
                    >
                      <Download className="mr-1.5 size-3.5" />
                      {isLoading ? 'Preparing…' : 'Download'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function dateStamp() {
  return new Date().toISOString().slice(0, 10);
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
