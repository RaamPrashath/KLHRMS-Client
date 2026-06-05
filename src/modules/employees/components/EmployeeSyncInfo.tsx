'use client';

import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EmployeeSyncInfoProps {
  syncedAt: string | null;
  microsoftId: string | null;
  accountEnabled: boolean;
  createdDateTime: string | null;
  status: string;
  icon?: ReactNode;
}

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

export function EmployeeSyncInfo({
  syncedAt,
  microsoftId,
  accountEnabled,
  createdDateTime,
  status,
  icon,
}: Readonly<EmployeeSyncInfoProps>) {
  const isActive = status === 'ACTIVE';
  const isSynced = !!microsoftId;

  return (
    <Card className="rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon ?? <Clock className="size-4 text-neutral-500" />}
          Microsoft Entra sync
        </CardTitle>
        <CardDescription>
          Information about the last Microsoft 365 sync for this employee
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Status
            </span>
            <span className="flex items-center gap-2 text-sm text-neutral-800">
              {isSynced ? (
                isActive ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    Synced · Active
                  </>
                ) : (
                  <>
                    <XCircle className="size-4 text-neutral-400" />
                    Synced · Inactive
                  </>
                )
              ) : (
                <Badge variant="outline">Not linked to Microsoft</Badge>
              )}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Account enabled
            </span>
            <span className="text-sm text-neutral-800">
              {isSynced ? (accountEnabled ? 'Yes' : 'No') : '—'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Last synced
            </span>
            <span className="text-sm text-neutral-800">
              {formatDateTime(syncedAt)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Microsoft ID
            </span>
            <span
              className="truncate font-mono text-xs text-neutral-700"
              title={microsoftId ?? undefined}
            >
              {microsoftId ?? '—'}
            </span>
          </div>

          {createdDateTime ? (
            <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Entra account created
              </span>
              <span className="text-sm text-neutral-800">
                {formatDateTime(createdDateTime)}
              </span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
