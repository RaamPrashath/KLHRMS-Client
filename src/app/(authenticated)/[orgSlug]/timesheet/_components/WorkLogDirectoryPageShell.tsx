'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
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
import { getTodayIST } from '@/modules/attendance/utils/attendanceFormatters';
import { useDepartmentMetaQuery, useDepartmentsQuery } from '@/modules/departments/hooks/useDepartmentsQuery';
import { TimesheetSubnav } from './TimesheetSubnav';
import { WorkLogDetailDialog } from './WorkLogDetailDialog';
import { WorkLogDirectoryTable } from './WorkLogDirectoryTable';
import { WorkLogExportButtons } from './WorkLogExportButtons';
import { WorkLogFiltersBar, type WorkLogPreset } from './WorkLogFiltersBar';

interface WorkLogDirectoryPageShellProps {
  orgSlug: string;
  memberId: string;
}

function subtractDays(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map(Number);
  const next = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  next.setUTCDate(next.getUTCDate() - days);
  return next.toISOString().slice(0, 10);
}

export function WorkLogDirectoryPageShell({
  orgSlug,
  memberId,
}: Readonly<WorkLogDirectoryPageShellProps>) {
  const today = getTodayIST();
  const [preset, setPreset] = useState<WorkLogPreset>('today');
  const [customDateFrom, setCustomDateFrom] = useState(today);
  const [customDateTo, setCustomDateTo] = useState(today);
  const [departmentId, setDepartmentId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedAttendanceRecordId, setSelectedAttendanceRecordId] = useState<string | null>(null);

  const permissionsQuery = useBulkAttendancePermissions(orgSlug, memberId);
  const departmentMetaQuery = useDepartmentMetaQuery(orgSlug, memberId, permissionsQuery.permissions.view === 'organization');
  const departmentsQuery = useDepartmentsQuery(orgSlug, memberId, { page: 1, pageSize: 100 });

  const dateFrom = preset === 'today' ? today : preset === 'last7' ? subtractDays(today, 6) : customDateFrom;
  const dateTo = preset === 'today' ? today : preset === 'last7' ? today : customDateTo;

  const departmentOptions = useMemo(
    () => (departmentMetaQuery.data?.departments ?? []).map((item) => ({ id: item.id, label: item.label })),
    [departmentMetaQuery.data?.departments],
  );

  const teamOptions = useMemo(() => {
    const departments = departmentsQuery.data?.items ?? [];
    const flattened = departments.flatMap((department) =>
      department.teams
        .filter(() => !departmentId || department.id === departmentId)
        .map((team) => ({ id: team.id, label: `${team.name}${department.name ? ` — ${department.name}` : ''}` })),
    );
    return flattened.sort((a, b) => a.label.localeCompare(b.label));
  }, [departmentId, departmentsQuery.data?.items]);

  const filters = useMemo(
    () => ({
      date_from: dateFrom,
      date_to: dateTo,
      department_id: departmentId || undefined,
      team_id: teamId || undefined,
      employee_name: employeeName.trim() || undefined,
      page,
      page_size: pageSize,
    }),
    [dateFrom, dateTo, departmentId, employeeName, page, pageSize, teamId],
  );

  const reportQuery = useWorkLogReportsQuery(
    orgSlug,
    memberId,
    permissionsQuery.permissions.view === 'organization' ? filters : undefined,
  );

  const totalPages = reportQuery.data ? Math.max(1, Math.ceil(reportQuery.data.total / pageSize)) : 1;

  if (permissionsQuery.isLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border bg-card">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (permissionsQuery.permissions.view !== 'organization') {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-600 dark:text-amber-400">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5" />
          <div>
            <p className="font-semibold">Organization-level attendance access is required.</p>
            <p className="mt-1 text-sm text-amber-600/90 dark:text-amber-400/90">
              This admin work-log directory is available to HR and Admin users with organization-wide attendance visibility.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-6 overflow-hidden bg-background">
      <div className="mx-7 flex shrink-0 flex-col gap-4 rounded-3xl border border-border bg-card p-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">Timesheet Reports</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-foreground">
            Employee Work Logs & Activity Reports
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Review daily work narratives captured at clock-out, filter by organization structure, and generate payroll-friendly exports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TimesheetSubnav orgSlug={orgSlug} />
          <WorkLogExportButtons
            orgSlug={orgSlug}
            memberId={memberId}
            filters={filters}
            disabled={(reportQuery.data?.total ?? 0) === 0 || reportQuery.isLoading}
          />
        </div>
      </div>

      <div className="mx-7 grid shrink-0 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Reported days</p>
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
          preset={preset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          departmentId={departmentId}
          teamId={teamId}
          employeeName={employeeName}
          employeeSuggestions={(departmentMetaQuery.data?.members ?? []).map((member) => ({ id: member.id, label: member.label }))}
          departmentOptions={departmentOptions}
          teamOptions={teamOptions}
          onPresetChange={(value) => {
            setPreset(value);
            setPage(1);
          }}
          onDateFromChange={(value) => {
            setCustomDateFrom(value);
            setPage(1);
          }}
          onDateToChange={(value) => {
            setCustomDateTo(value);
            setPage(1);
          }}
          onDepartmentChange={(value) => {
            setDepartmentId(value);
            setTeamId('');
            setPage(1);
          }}
          onTeamChange={(value) => {
            setTeamId(value);
            setPage(1);
          }}
          onEmployeeNameChange={(value) => {
            setEmployeeName(value);
            setPage(1);
          }}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            {reportQuery.isError ? (
              <div className="m-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-600 dark:text-rose-400">
                {reportQuery.error?.message ?? 'Failed to load work-log reports.'}
              </div>
            ) : (
              <WorkLogDirectoryTable
                rows={reportQuery.data?.items ?? []}
                isLoading={reportQuery.isLoading}
                pageSize={pageSize}
                onRowClick={setSelectedAttendanceRecordId}
              />
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-border bg-card p-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing page {page} of {totalPages} for {reportQuery.data?.total ?? 0} reported work-log days.
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
    </div>
  );
}
