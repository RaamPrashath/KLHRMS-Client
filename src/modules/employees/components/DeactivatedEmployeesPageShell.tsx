'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeactivatedEmployeesQuery, useReactivateEmployeeMutation } from '@/modules/employees/hooks/useEmployeesQuery';
import { DeactivatedEmployeeTable } from './DeactivatedEmployeeTable';
import type { EmployeeListItem } from '@/modules/employees/types/employeeTypes';

interface DeactivatedEmployeesPageShellProps {
  orgSlug: string;
  memberId: string;
}

export function DeactivatedEmployeesPageShell({
  orgSlug,
  memberId,
}: Readonly<DeactivatedEmployeesPageShellProps>) {
  const router = useRouter();
  const { data, isLoading, isError, error } = useDeactivatedEmployeesQuery(orgSlug, memberId);
  const reactivateMutation = useReactivateEmployeeMutation(orgSlug, memberId);

  const allItems: EmployeeListItem[] = useMemo(() => data?.items ?? [], [data?.items]);

  const handleReactivate = useCallback(
    (targetMemberId: string, employeeName: string) => {
      reactivateMutation.mutate(targetMemberId, {
        onSuccess: () => {
          toast.success(`${employeeName} has been reactivated`);
        },
        onError: (err) => {
          let message = 'Failed to reactivate employee';
          try { const parsed = JSON.parse(err.message); if (parsed.message) message = parsed.message; }
          catch { if (err.message) message = err.message; }
          toast.error(message);
        },
      });
    },
    [reactivateMutation],
  );

  if (isError) {
    let message = 'Failed to load deactivated employees.';
    try {
      const parsed = JSON.parse(error?.message ?? '{}');
      if (parsed.message) message = parsed.message;
    } catch {
      // ignore parse errors
    }
    return (
      <div className="flex flex-col flex-1 mx-7 mb-7 gap-6">
        <div className="flex items-center gap-2 pt-7 text-sm text-neutral-500">
          <button
            type="button"
            onClick={() => router.push(`/${orgSlug}/employees`)}
            className="hover:text-neutral-900 transition-colors"
          >
            Employees
          </button>
          <ChevronRight className="size-4" />
          <span className="text-neutral-900 font-medium">Deactivated</span>
        </div>
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-100 bg-surface p-8">
          <p className="text-sm text-destructive-text">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 flex-1 bg-canvas min-h-full">
      <div className="flex flex-col ml-7 mt-7 mr-7 gap-1">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <button
            type="button"
            onClick={() => router.push(`/${orgSlug}/employees`)}
            className="hover:text-neutral-900 transition-colors"
          >
            Employees
          </button>
          <ChevronRight className="size-4" />
          <span className="text-neutral-900 font-medium">Deactivated</span>
        </div>
      </div>
      <DeactivatedEmployeeTable
        data={allItems}
        isLoading={isLoading || reactivateMutation.isPending}
        onReactivate={handleReactivate}
        isReactivating={reactivateMutation.isPending}
      />
    </div>
  );
}
