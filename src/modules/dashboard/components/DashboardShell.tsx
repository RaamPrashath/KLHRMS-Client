"use client";

import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClockWidget } from "@/modules/attendance/components/ClockWidget";

interface DashboardShellProps {
  orgSlug: string;
  memberId: string;
}

export function DashboardShell({ orgSlug, memberId }: Readonly<DashboardShellProps>) {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Top row: clock widget + bulk attendance button */}
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        {/* Clock widget — grows to fill available space */}
        <div className="flex-1 min-w-0">
          <ClockWidget orgSlug={orgSlug} memberId={memberId} />
        </div>

        {/* Bulk attendance redirect button */}
        <div className="flex sm:flex-col items-stretch sm:items-center justify-center shrink-0">
          <Button
            asChild
            variant="outline"
            className="h-full min-h-[80px] sm:min-h-[240px] sm:w-48 flex flex-col gap-2 rounded-2xl border-neutral-200 bg-surface shadow-none hover:bg-neutral-50 transition-colors"
          >
            <Link href={`/${orgSlug}/attendance/bulk`}>
              <CalendarRange className="size-6 text-neutral-500 shrink-0" />
              <span className="text-sm font-medium text-neutral-700 text-center leading-snug">
                Bulk Attendance
              </span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
