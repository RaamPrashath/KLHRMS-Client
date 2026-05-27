'use client';

import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBulkAttendancePermissions } from '@/modules/attendance/hooks/queries/attendance';
import { useWorkLogReportsQuery } from '@/modules/attendance/hooks/queries/workLogReports';
import { useDepartmentMetaQuery } from '@/modules/departments/hooks/useDepartmentsQuery';
import { WorkLogDetailDialog } from './WorkLogDetailDialog';
import { WorkLogDirectoryTable } from './WorkLogDirectoryTable';
import { WorkLogFiltersBar } from './WorkLogFiltersBar';

interface WorkLogDirectorySectionProps {
  orgSlug: string;
  memberId: string;
}

export function WorkLogDirectorySection({
  orgSlug,
  memberId,
}: Readonly<WorkLogDirectorySectionProps>) {
  const [employeeName, setEmployeeName] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedAttendanceRecordId, setSelectedAttendanceRecordId] = useState<string | null>(null);

  const permissionsQuery = useBulkAttendancePermissions(orgSlug, memberId);
  const departmentMetaQuery = useDepartmentMetaQuery(orgSlug, memberId, permissionsQuery.permissions.view === 'organization');
  const filters = {
    employee_name: employeeName.trim() || undefined,
    page,
    page_size: pageSize,
  };

  const reportQuery = useWorkLogReportsQuery(
    orgSlug,
    memberId,
    permissionsQuery.permissions.view === 'organization' ? filters : undefined,
  );
  const employeeLabelById = useMemo(
    () =>
      new Map(
        (departmentMetaQuery.data?.members ?? []).map((member) => [member.id, member.label]),
      ),
    [departmentMetaQuery.data?.members],
  );
  const tableRows = useMemo(
    () =>
      (reportQuery.data?.items ?? []).map((row) => ({
        ...row,
        employeeName: employeeLabelById.get(row.employeeId) ?? row.employeeName,
      })),
    [employeeLabelById, reportQuery.data?.items],
  );

  const totalPages = reportQuery.data ? Math.max(1, Math.ceil(reportQuery.data.total / pageSize)) : 1;

  if (permissionsQuery.permissions.view !== 'organization') {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-600 dark:text-amber-400">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5" />
          <div>
            <p className="font-semibold">Organization-level timesheet visibility is required.</p>
            <p className="mt-1 text-sm text-amber-600/90 dark:text-amber-400/90">
              Only HR and Admin users with organization-wide access can open employee timesheet entries.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-7 grid shrink-0 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Entries</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{reportQuery.data?.summary.total_days ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Logged hours</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{reportQuery.data?.summary.total_hours?.toFixed(1) ?? '0.0'}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Employees</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{reportQuery.data?.summary.employee_count ?? 0}</p>
        </div>
      </div>

      <div className="mx-7 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <WorkLogFiltersBar
          employeeName={employeeName}
          employeeSuggestions={(departmentMetaQuery.data?.members ?? []).map((member) => ({ id: member.id, label: member.label }))}
          onEmployeeNameChange={(value) => {
            setEmployeeName(value);
            setPage(1);
          }}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <div className="min-h-0 flex-1 overflow-auto">
            {reportQuery.isError ? (
              <div className="m-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-600 dark:text-rose-400">
                {reportQuery.error?.message ?? 'Failed to load timesheet entries.'}
              </div>
            ) : (
              <WorkLogDirectoryTable
                rows={tableRows}
                isLoading={reportQuery.isLoading || permissionsQuery.isLoading}
                pageSize={pageSize}
                onRowClick={setSelectedAttendanceRecordId}
              />
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing page {page} of {totalPages} for {reportQuery.data?.total ?? 0} timesheet entries.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 w-[92px] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button type="button" variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <WorkLogDetailDialog
        orgSlug={orgSlug}
        memberId={memberId}
        attendanceRecordId={selectedAttendanceRecordId}
        open={selectedAttendanceRecordId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAttendanceRecordId(null);
        }}
      />
    </>
  );
}
