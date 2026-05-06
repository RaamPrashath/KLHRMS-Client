'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { addMonths, format, isSameMonth, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Landmark, PlaneTakeoff, Sparkles, Umbrella } from 'lucide-react';

import { Calendar } from '@/components/ui/calendar';
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

export function LeaveSidebar({
  orgSlug,
  activeSection,
  canApprove,
  month,
  onMonthChange,
  holidays,
}: Readonly<LeaveSidebarProps>) {
  const today = new Date();
  const shouldHighlightToday = isSameMonth(month, today);
  const holidayDates = useMemo(() => holidays.map((holiday) => parseISO(holiday.holidayDate)), [holidays]);

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || canApprove);

  return (
    <aside className="w-full shrink-0 border-b border-white/[0.08] bg-[var(--color-sidebar-bg)] px-5 py-5 lg:w-[260px] lg:border-b-0 lg:border-r lg:border-r-white/[0.08]">
      <div className="space-y-4">
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

        <Calendar
          mode="single"
          month={month}
          onMonthChange={onMonthChange}
          selected={shouldHighlightToday ? today : undefined}
          showOutsideDays
          className="w-full bg-transparent p-0 text-[var(--color-sidebar-text-hover)]"
          buttonVariant="ghost"
          modifiers={{ holiday: holidayDates }}
          modifiersClassNames={{
            holiday:
              '[&>button]:font-medium [&>button]:text-[#72e3a5] [&>button]:after:absolute [&>button]:after:bottom-1.5 [&>button]:after:left-1/2 [&>button]:after:size-1 [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full [&>button]:after:bg-[#72e3a5]',
          }}
          classNames={{
            root: 'w-full',
            months: 'w-full',
            month: 'w-full gap-3',
            month_caption: 'hidden',
            caption_label: 'hidden',
            nav: 'hidden',
            weekdays: 'mb-1 grid grid-cols-7',
            weekday: 'text-center text-[11px] font-medium text-neutral-500',
            week: 'mt-1 grid grid-cols-7',
            day: 'aspect-square p-0',
            outside: '[&>button]:text-neutral-700 [&>button]:opacity-55',
            today: shouldHighlightToday ? '' : '[&>button]:bg-transparent',
          }}
        />

        <div className="h-px bg-white/[0.08]" />

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
  );
}
