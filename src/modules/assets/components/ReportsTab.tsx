'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ACTION_GREEN, REPORT_GROUPS, REPORT_TYPE_ICONS } from '@/modules/assets/lib/assetConfig';
import {
  base64ToBlob,
  humanize,
  readError,
  reportDescriptions,
} from '@/modules/assets/lib/assetUtils';
import { exportAssetsCsvAction, exportAssetsPdfAction } from '@/modules/assets/api/assetServerActions';
import type {
  AssetLookupOption,
  AssetReportType,
} from '@/modules/assets/types/assetTypes';

export function ReportsTab({
  orgSlug,
  memberId,
  members,
}: {
  orgSlug: string;
  memberId: string;
  members: AssetLookupOption[];
}) {
  const [reportFormats, setReportFormats] = useState<Record<string, 'pdf' | 'csv'>>({});
  const [reportEmployeeFilter, setReportEmployeeFilter] = useState<string>('');

  async function handleExportReport(reportType: AssetReportType, format: 'pdf' | 'csv' = 'pdf') {
    try {
      if (format === 'csv') {
        const csv = await exportAssetsCsvAction({
          orgSlug,
          memberId,
          reportType,
          memberIdFilter: reportType === 'EMPLOYEE_ASSET_REPORT' ? reportEmployeeFilter || undefined : undefined,
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${reportType.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Report downloaded as CSV');
      } else {
        const pdf = await exportAssetsPdfAction({
          orgSlug,
          memberId,
          reportType,
          memberIdFilter: reportType === 'EMPLOYEE_ASSET_REPORT' ? reportEmployeeFilter || undefined : undefined,
        });
        const blob = base64ToBlob(pdf.base64, 'application/pdf');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = pdf.fileName;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Report downloaded as PDF');
      }
    } catch (error) {
      toast.error(readError(error, 'Failed to export report'));
    }
  }

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-3">
        {REPORT_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          return (
            <div key={group.label} className="overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-white shadow-[0_1px_0_rgba(17,24,39,0.03)]">
              <div className="flex items-center gap-2.5 border-b border-[#e5e7eb] bg-[#f7f8fa] px-4 py-3">
                <GroupIcon className="size-4 text-[#6b7280]" />
                <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">{group.label}</span>
              </div>
              <div className="divide-y divide-[#eef0f3]">
                {group.types.map((reportType) => {
                  const ReportIcon = REPORT_TYPE_ICONS[reportType];
                  const format = reportFormats[reportType] || 'pdf';
                  const isEmployeeReport = reportType === 'EMPLOYEE_ASSET_REPORT';
                  return (
                    <div key={reportType} className="px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-[#f8f9fc] text-[#6b7280] shadow-[inset_0_0_0_1px_#e5e7eb]">
                            <ReportIcon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-medium text-[#111827]">{humanize(reportType)}</p>
                            <p className="mt-0.5 text-[12px] leading-4 text-[#6b7280]">{reportDescriptions(reportType)}</p>
                          </div>
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
                              <option key={m.id} value={m.id}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        <select
                          value={format}
                          onChange={(e) => setReportFormats((p) => ({ ...p, [reportType]: e.target.value as 'pdf' | 'csv' }))}
                          className="h-9 rounded-xl border border-[#e5e7eb] bg-white px-2.5 text-[12px] text-[#6b7280] outline-none"
                        >
                          <option value="pdf">PDF</option>
                          <option value="csv">CSV</option>
                        </select>
                        <Button
                          variant="outline"
                          disabled={isEmployeeReport && !reportEmployeeFilter}
                          className="h-9 flex-1 rounded-xl border border-[#e5e7eb] text-[13px]"
                          onClick={() => void handleExportReport(reportType, format)}
                        >
                          <Download className="mr-1.5 size-3.5" />
                          Download
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
