"use client";

import Link from "next/link";
import { CalendarClock, FileText } from "lucide-react";
import { DashboardClockWidget } from "./DashboardClockWidget";
import { TodayWorkLogsCard } from "./TodayWorkLogsCard";

interface DashboardShellProps {
  orgSlug: string;
  memberId: string;
}

export function DashboardShell({ orgSlug, memberId }: Readonly<DashboardShellProps>) {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">

      {/* ── Row 1: Clock widget + quick-action buttons ── */}
      {/* items-stretch makes both children fill the row height equally */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">

        {/* Dashboard clock widget — fills height of the row */}
        <div className="min-w-0 flex-1">
          <DashboardClockWidget orgSlug={orgSlug} memberId={memberId} />
        </div>

        {/* Quick-action buttons — stacked, each takes exactly half the row */}
        <div className="flex shrink-0 flex-row gap-3 sm:flex-col sm:w-44">
          <Link
            href={`/${orgSlug}/timesheet`}
            className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-surface px-4 py-5 text-center transition-colors hover:bg-neutral-50"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-info-bg">
              <CalendarClock className="size-5 text-info-text" />
            </div>
            <span className="text-sm font-medium text-neutral-700 leading-snug">
              Timesheet
            </span>
          </Link>

          <Link
            href={`/${orgSlug}/leaves`}
            className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-surface px-4 py-5 text-center transition-colors hover:bg-neutral-50"
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-warning-bg">
              <FileText className="size-5 text-warning-text" />
            </div>
            <span className="text-sm font-medium text-neutral-700 leading-snug">
              Apply Leave
            </span>
          </Link>
        </div>
      </div>

      {/* ── Row 2: Today's work logs ── */}
      <TodayWorkLogsCard orgSlug={orgSlug} memberId={memberId} />

    </div>
  );
}
