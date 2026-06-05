'use client';

import {
  ArrowLeft,
  Building2,
  Globe2,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserCog,
  UserX,
  Users,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getScope, type RolePermissions } from '@/lib/hrms-roles';
import {
  useEmployeeDetailQuery,
  useRefreshEmployeeFromGraphMutation,
} from '@/modules/employees/hooks/useEmployeeDetailQuery';
import { useDeactivateEmployeeMutation } from '@/modules/employees/hooks/useEmployeesQuery';
import { DeactivateEmployeeDialog } from '@/modules/employees/components/DeactivateEmployeeDialog';
import { EditEmployeeDialog } from '@/modules/employees/components/EditEmployeeDialog';
import { EmployeeOrgChart } from '@/modules/employees/components/EmployeeOrgChart';
import { EmployeeSyncInfo } from '@/modules/employees/components/EmployeeSyncInfo';
import type { EmployeeDetail } from '@/modules/employees/types/employeeDetailTypes';

interface EmployeeDetailPageShellProps {
  orgSlug: string;
  memberId: string;
  permissions: RolePermissions | null;
  targetMemberId: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function fullAddress(detail: EmployeeDetail): string | null {
  const a = detail.address;
  if (!a) return null;
  const parts = [a.street, a.city, a.state, a.postal_code, a.country].filter(
    (p): p is string => !!p && p.trim().length > 0,
  );
  if (parts.length === 0) return null;
  return parts.join(', ');
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 px-7 pb-10">
      <div className="flex items-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: Readonly<{ label: string; value: string | null | undefined; icon?: React.ReactNode }>) {
  const display = value && value.trim().length > 0 ? value : '—';
  const isEmpty = display === '—';
  return (
    <div className="flex items-start gap-3 py-2">
      {icon ? (
        <span className="mt-0.5 text-neutral-400 [&_svg]:size-4">{icon}</span>
      ) : null}
      <div className="flex min-w-0 flex-col">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          {label}
        </span>
        <span
          className={`truncate text-sm ${isEmpty ? 'text-neutral-400' : 'text-neutral-800'}`}
          title={isEmpty ? undefined : display}
        >
          {display}
        </span>
      </div>
    </div>
  );
}

export function EmployeeDetailPageShell({
  orgSlug,
  memberId,
  permissions,
  targetMemberId,
}: Readonly<EmployeeDetailPageShellProps>) {
  const router = useRouter();
  const { data, isLoading, isError, error } = useEmployeeDetailQuery(
    orgSlug,
    memberId,
    targetMemberId,
  );

  const canEdit = permissions
    ? getScope(permissions, 'employees', 'edit') !== 'none'
    : false;

  const refreshMutation = useRefreshEmployeeFromGraphMutation(
    orgSlug,
    memberId,
    targetMemberId,
  );
  const deactivateMutation = useDeactivateEmployeeMutation(orgSlug, memberId);

  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const handleRefresh = () => {
    const promise = refreshMutation.mutateAsync();
    toast.promise(promise, {
      loading: 'Refreshing profile from Microsoft Entra...',
      success: (res) => {
        if (res.manager_resolved) {
          return `Profile refreshed · ${res.direct_reports_count} direct reports · ${res.groups_count} groups`;
        }
        return 'Profile refreshed';
      },
      error: (err) => {
        try {
          const parsed = JSON.parse(err.message) as { message?: string };
          return parsed.message ?? 'Failed to refresh from Microsoft';
        } catch {
          return 'Failed to refresh from Microsoft';
        }
      },
    });
  };

  const detail = data;
  const isMicrosoftLinked =
    !!detail?.sync.microsoft_id && !detail.sync.microsoft_id.startsWith('manual:');

  const headerSubtitle = useMemo(() => {
    if (!detail) return '';
    const parts: string[] = [];
    if (detail.employment.job_title) parts.push(detail.employment.job_title);
    if (detail.employment.department) parts.push(detail.employment.department);
    return parts.join(' · ');
  }, [detail]);

  if (isLoading) return <DetailSkeleton />;

  if (isError || !detail) {
    let message = 'Failed to load employee detail.';
    try {
      const parsed = JSON.parse(error?.message ?? '{}');
      if (parsed.message) message = parsed.message;
    } catch {
      // ignore parse errors
    }
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-100 bg-surface p-8 mx-7 mt-7">
        <p className="text-sm text-destructive-text">{message}</p>
      </div>
    );
  }

  const addressLine = fullAddress(detail);

  return (
    <div className="flex flex-col gap-6 flex-1 bg-canvas min-h-full">
      {/* Header */}
      <div className="flex flex-col gap-4 px-7 pt-7">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${orgSlug}/employees`)}
            className="-ml-2 text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="size-4" />
            Back to employees
          </Button>
          {canEdit ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" />
                Edit
              </Button>
              {isMicrosoftLinked ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshMutation.isPending}
                >
                  {refreshMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Refresh from Microsoft
                </Button>
              ) : null}
              {detail.sync.status === 'ACTIVE' ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDeactivateOpen(true)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <UserX className="size-4" />
                  Deactivate
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-5">
          <Avatar className="size-20 ring-1 ring-black/[0.06]">
            <AvatarImage
              src={detail.image ?? undefined}
              alt={detail.name}
            />
            <AvatarFallback className="bg-primary-subtle text-xl font-semibold text-primary">
              {getInitials(detail.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-3xl font-semibold tracking-tight text-neutral-900">
                {detail.name}
              </h1>
              {detail.sync.status === 'ACTIVE' ? (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  Active
                </Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
              {detail.role ? (
                <Badge variant="outline">{detail.role.name}</Badge>
              ) : null}
            </div>
            {headerSubtitle ? (
              <p className="truncate text-sm text-neutral-600">{headerSubtitle}</p>
            ) : null}
            <p className="text-xs text-neutral-400">
              Joined {formatDate(detail.joined_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 gap-4 px-7 pb-10 lg:grid-cols-3">
        {/* Contact */}
        <Card className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4 text-neutral-500" />
              Contact
            </CardTitle>
            <CardDescription>Email, phone, and office</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col">
            <InfoRow
              label="Primary email"
              value={detail.contact.email}
              icon={<Mail className="size-4" />}
            />
            <InfoRow
              label="User principal name"
              value={detail.contact.user_principal_name}
              icon={<Globe2 className="size-4" />}
            />
            <InfoRow
              label="Mobile"
              value={detail.contact.mobile_phone}
              icon={<Phone className="size-4" />}
            />
            {detail.contact.business_phones.length > 0 ? (
              <InfoRow
                label="Business phones"
                value={detail.contact.business_phones.join(', ')}
                icon={<Phone className="size-4" />}
              />
            ) : null}
            <InfoRow
              label="Office location"
              value={detail.contact.office_location}
              icon={<Building2 className="size-4" />}
            />
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="size-4 text-neutral-500" />
              Address
            </CardTitle>
            <CardDescription>From Microsoft Entra profile</CardDescription>
          </CardHeader>
          <CardContent>
            {addressLine ? (
              <p className="text-sm text-neutral-800">{addressLine}</p>
            ) : (
              <p className="text-sm text-neutral-400">No address on file</p>
            )}
            {detail.address?.country ? (
              <p className="mt-3 text-xs text-neutral-500">
                Usage location: {detail.employment.usage_location ?? detail.address.country}
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Employment */}
        <Card className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="size-4 text-neutral-500" />
              Employment
            </CardTitle>
            <CardDescription>Position, type, and tenure</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <InfoRow label="Employee ID" value={detail.employment.employee_id} />
            <InfoRow label="Job title" value={detail.employment.job_title} />
            <InfoRow label="Department" value={detail.employment.department} />
            <InfoRow label="Company" value={detail.employment.company_name} />
            <InfoRow label="Employee type" value={detail.employment.employee_type} />
            <InfoRow label="Hire date" value={formatDate(detail.employment.hire_date)} />
            <InfoRow label="User type" value={detail.employment.user_type} />
            <InfoRow
              label="Preferred language"
              value={detail.employment.preferred_language}
            />
          </CardContent>
        </Card>

        {/* Manager */}
        <Card className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-neutral-500" />
              Manager
            </CardTitle>
            <CardDescription>Reports to</CardDescription>
          </CardHeader>
          <CardContent>
            {detail.manager ? (
              <Link
                href={`/${orgSlug}/employees/${detail.manager.member_id ?? ''}`}
                className="flex items-center gap-3 rounded-xl border border-black/[0.04] p-3 transition-colors hover:bg-black/[0.02]"
              >
                <Avatar className="size-10">
                  <AvatarImage
                    src={detail.manager.image ?? undefined}
                    alt={detail.manager.name}
                  />
                  <AvatarFallback className="bg-primary-subtle text-sm font-medium text-primary">
                    {getInitials(detail.manager.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-neutral-900">
                    {detail.manager.name}
                  </span>
                  <span className="truncate text-xs text-neutral-500">
                    {detail.manager.job_title ?? 'No job title'}
                    {detail.manager.department ? ` · ${detail.manager.department}` : ''}
                  </span>
                </div>
              </Link>
            ) : (
              <p className="text-sm text-neutral-400">No manager assigned</p>
            )}
          </CardContent>
        </Card>

        {/* Direct reports count + link */}
        <Card className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersRound className="size-4 text-neutral-500" />
              Direct reports
            </CardTitle>
            <CardDescription>People who report to this employee</CardDescription>
          </CardHeader>
          <CardContent>
            {detail.direct_reports.length === 0 ? (
              <p className="text-sm text-neutral-400">No direct reports</p>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-2xl font-semibold text-neutral-900">
                  {detail.direct_reports.length}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {detail.direct_reports.slice(0, 5).map((report) => (
                    <li
                      key={report.member_id ?? report.microsoft_id ?? report.name}
                      className="flex items-center gap-2 truncate text-sm text-neutral-700"
                    >
                      <Avatar className="size-6">
                        <AvatarImage
                          src={report.image ?? undefined}
                          alt={report.name}
                        />
                        <AvatarFallback className="bg-primary-subtle text-[10px] font-medium text-primary">
                          {getInitials(report.name)}
                        </AvatarFallback>
                      </Avatar>
                      <Link
                        href={`/${orgSlug}/employees/${report.member_id ?? ''}`}
                        className="truncate hover:underline"
                      >
                        {report.name}
                      </Link>
                    </li>
                  ))}
                  {detail.direct_reports.length > 5 ? (
                    <li className="text-xs text-neutral-500">
                      +{detail.direct_reports.length - 5} more
                    </li>
                  ) : null}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Org chart (manager chain + direct reports) — full width */}
        <div className="lg:col-span-3">
          <EmployeeOrgChart
            orgSlug={orgSlug}
            currentName={detail.name}
            manager={detail.manager}
            managerChain={detail.manager_chain}
            directReports={detail.direct_reports}
          />
        </div>

        {/* Sync info — full width */}
        <div className="lg:col-span-3">
          <EmployeeSyncInfo
            syncedAt={detail.sync.synced_at}
            microsoftId={detail.sync.microsoft_id}
            accountEnabled={detail.sync.account_enabled}
            createdDateTime={detail.sync.created_date_time}
            status={detail.sync.status}
            icon={<ShieldCheck className="size-4 text-neutral-500" />}
          />
        </div>
      </div>

      {canEdit ? (
        <>
          <EditEmployeeDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            orgSlug={orgSlug}
            memberId={memberId}
            employee={detail}
          />
          <DeactivateEmployeeDialog
            open={deactivateOpen}
            onOpenChange={setDeactivateOpen}
            employeeName={detail.name}
            employeeMemberId={detail.member_id}
            deactivateMutation={deactivateMutation}
          />
        </>
      ) : null}
    </div>
  );
}
