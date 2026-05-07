'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  addMonths,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  eachDayOfInterval,
  endOfMonth,
  getDay,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Landmark, PlaneTakeoff, Sparkles, Umbrella } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { HolidayRecord } from '@/modules/leave/types/leaveTypes';

export type LeaveSection = 'requests' | 'balances' | 'leave-types' | 'holidays';

interface LeaveSidebarProps {
  orgSlug: string;
  activeSection: LeaveSection;
  canApprove: boolean;
  month: Date;
  onMonthChange: (month: Date) => void;
  holidays: HolidayRecord[];
}

const NAV_ITEMS = [
  { key: 'requests', label: 'Requests', icon: PlaneTakeoff },
  { key: 'balances', label: 'Balances', icon: Landmark },
  { key: 'leave-types', label: 'Leave Types', icon: Sparkles, adminOnly: true },
  { key: 'holidays', label: 'Holidays', icon: Umbrella, adminOnly: true },
] satisfies Array<{
  key: LeaveSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}>;

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface DayHoliday {
  name: string;
  isMandatory: boolean;
}

export function LeaveSidebar({
  orgSlug,
  activeSection,
  canApprove,
  month,
  onMonthChange,
  holidays,
}: Readonly<LeaveSidebarProps>) {
  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || canApprove);
  const holidayMap = useMemo(() => {
    const map = new Map<string, DayHoliday[]>();
    for (const h of holidays) {
      const key = h.holidayDate.slice(0, 10);
      const existing = map.get(key) ?? [];
      existing.push({ name: h.name, isMandatory: h.isHoliday });
      map.set(key, existing);
    }
    return map;
  }, [holidays]);

  // Build calendar grid: days of the month padded to start on Sunday
  const days = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const allDays = eachDayOfInterval({ start, end });
    const leadingBlanks = getDay(start); // 0=Sun
    return { allDays, leadingBlanks };
  }, [month]);

  return (
    <TooltipProvider delayDuration={200}>
      {/* sticky: stays in place while main content scrolls */}
      <aside className="w-full shrink-0 border-b border-white/[0.08] bg-[var(--color-sidebar-bg)] lg:sticky lg:top-0 lg:h-dvh lg:w-[260px] lg:overflow-y-auto lg:border-b-0 lg:border-r lg:border-r-white/[0.08]">
        <div className="space-y-4 px-5 py-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => onMonthChange(addMonths(month, -1))}
                className="flex size-8 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => onMonthChange(addMonths(month, 1))}
                className="flex size-8 items-center justify-center rounded-full border border-white/8 bg-white/[0.03] text-neutral-300 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <p className="text-sm font-medium text-white">{format(month, 'MMMM yyyy')}</p>
          </div>

          {/* Custom calendar grid */}
          <div className="w-full select-none">
            {/* Weekday headers */}
            <div className="mb-1 grid grid-cols-7">
              {WEEKDAY_LABELS.map((d) => (
                <div key={d} className="text-center text-[11px] font-medium text-neutral-500">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {/* Leading blank cells */}
              {Array.from({ length: days.leadingBlanks }, (_, i) => (
                <div key={`blank-${WEEKDAY_LABELS[i]}`} className="aspect-square" />
              ))}

              {days.allDays.map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayHolidays = holidayMap.get(key) ?? [];
                const hasMandatory = dayHolidays.some((h) => h.isMandatory);
                const hasOptional = dayHolidays.some((h) => !h.isMandatory);
                const isCurrentDay = isToday(day);
                const isCurrentMonth = isSameMonth(day, month);
                const tooltipLines = dayHolidays.map((h) => h.name).join('\n');

                let numberClass: string;
                if (isCurrentDay) {
                  numberClass = 'bg-[#72e3a5] font-semibold text-[#0a1a12]';
                } else if (dayHolidays.length > 0) {
                  numberClass = 'font-medium text-[#72e3a5]';
                } else {
                  numberClass = 'text-neutral-300';
                }

                const cell = (
                  <div
                    className={cn(
                      'relative flex aspect-square flex-col items-center justify-center gap-0',
                      !isCurrentMonth && 'opacity-30',
                    )}
                  >
                    {/* Date number */}
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-[12px] leading-none',
                        numberClass,
                      )}
                    >
                      {format(day, 'd')}
                    </span>

                    {/* Indicators below the number */}
                    {(hasMandatory || hasOptional) && (
                      <div className="mt-0.5 flex items-center justify-center gap-0.5">
                        {hasMandatory && (
                          /* Mandatory holiday: short underline/bar */
                          <span className="block h-[2px] w-3 rounded-full bg-[#72e3a5]" />
                        )}
                        {hasOptional && !hasMandatory && (
                          /* Optional holiday: small dot */
                          <span className="block size-1 rounded-full bg-neutral-500" />
                        )}
                        {hasOptional && hasMandatory && (
                          /* Both: dot alongside bar */
                          <span className="block size-1 rounded-full bg-neutral-500" />
                        )}
                      </div>
                    )}
                  </div>
                );

                if (dayHolidays.length === 0) {
                  return <div key={key}>{cell}</div>;
                }

                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <div className="cursor-default">{cell}</div>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      className="max-w-[180px] whitespace-pre-line text-center text-xs"
                    >
                      {tooltipLines}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-white/[0.08]" />

          {/* Nav */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.key === activeSection;
              return (
                <Link
                  key={item.key}
                  href={`/${orgSlug}/leaves/${item.key}`}
                  className={cn(
                    'flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors duration-150',
                    active
                      ? 'bg-[#00874A]/[0.05] text-[#72e3a5]'
                      : 'text-neutral-400 hover:bg-white/[0.04] hover:text-white',
                  )}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </TooltipProvider>
  );
}
