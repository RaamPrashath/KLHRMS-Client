"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { useCalendarEventsQuery, useHolidaysQuery } from "@/hooks/queries/leave";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { HrmsRole } from "@/lib/hrms-roles";

interface LeaveCalendarViewProps {
  orgSlug: string;
  orgId: string;
  role: HrmsRole | null;
}

export function LeaveCalendarView({ orgSlug, orgId, role }: LeaveCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFrom = format(calendarStart, "yyyy-MM-dd");
  const dateTo = format(calendarEnd, "yyyy-MM-dd");

  const { data: events = [], isLoading: eventsLoading } = useCalendarEventsQuery(
    orgSlug, orgId, dateFrom, dateTo,
  );
  const { data: holidays = [], isLoading: holidaysLoading } = useHolidaysQuery(orgSlug, orgId);

  const isAdminView =
    role === HrmsRole.SUPER_ADMIN ||
    role === HrmsRole.HR ||
    role === HrmsRole.ADMIN ||
    role === HrmsRole.MANAGER;

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [calendarStart.toISOString(), calendarEnd.toISOString()]);

  const getDayEvents = (date: Date) =>
    events.filter((e) => {
      const start = parseISO(e.start_date);
      const end = parseISO(e.end_date);
      return date >= start && date <= end;
    });

  const getDayHolidays = (date: Date) =>
    holidays.filter((h) => isSameDay(parseISO(h.holiday_date), date));

  const isLoading = eventsLoading || holidaysLoading;
  const today = new Date();

  return (
    <div className="flex flex-col gap-5">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-bold tracking-tight">
            {format(currentDate, "MMMM yyyy")}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs font-semibold"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-[480px] rounded-xl" />
      ) : (
        <div className="rounded-xl border overflow-hidden shadow-sm">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b bg-muted/40">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((wd) => (
              <div
                key={wd}
                className="py-2.5 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest"
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 divide-x divide-y">
            {calendarDays.map((day, idx) => {
              const dayEvents = getDayEvents(day);
              const dayHolidays = getDayHolidays(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, today);
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <div
                  key={idx}
                  className={[
                    "min-h-[96px] p-2 flex flex-col gap-1 transition-colors",
                    !isCurrentMonth ? "bg-muted/20" : isWeekend ? "bg-muted/10" : "bg-background",
                  ].join(" ")}
                >
                  {/* Day number */}
                  <span
                    className={[
                      "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full shrink-0 self-start",
                      isToday
                        ? "bg-foreground text-background font-black"
                        : isCurrentMonth
                        ? isWeekend ? "text-muted-foreground" : "text-foreground"
                        : "text-muted-foreground/30",
                    ].join(" ")}
                  >
                    {format(day, "d")}
                  </span>

                  {/* Holidays */}
                  {dayHolidays.map((h) => (
                    <div
                      key={h.id}
                      className="truncate rounded-md bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 border border-orange-200/60"
                      title={h.name}
                    >
                      🎉 {h.name}
                    </div>
                  ))}

                  {/* Leave events */}
                  {dayEvents.slice(0, 2).map((e) => (
                    <div
                      key={e.id}
                      className="truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: `${e.leave_type_color || "#3b82f6"}18`,
                        color: e.leave_type_color || "#3b82f6",
                        border: `1px solid ${e.leave_type_color || "#3b82f6"}30`,
                      }}
                      title={`${e.employee_name ?? ""} — ${e.leave_type_name ?? "Leave"}`}
                    >
                      {isAdminView
                        ? (e.employee_name || "Employee")
                        : (e.leave_type_name || "Leave")}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-muted-foreground/70 font-medium px-1">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-orange-100 border border-orange-200" />
          <span>Public Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-blue-100 border border-blue-200" />
          <span>Leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded bg-muted/40 border border-border" />
          <span>Weekend</span>
        </div>
        {isAdminView && (
          <span className="ml-auto text-muted-foreground/60 text-[11px] font-medium">
            Team view • Showing all employees
          </span>
        )}
      </div>
    </div>
  );
}