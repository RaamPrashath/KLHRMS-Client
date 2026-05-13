"use client";

import { useCallback, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Matcher } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { useBulkAttendanceRangeQuery } from "@/modules/attendance/hooks/queries/attendance";
import { useBulkAttendanceData } from "@/modules/attendance/hooks/use-bulk-attendance-data";
import { useHolidays } from "@/modules/leave/hooks/useHolidays";
import { useLeaveRequests } from "@/modules/leave/hooks/useLeaveRequests";
import { WorkLogDialog } from "@/app/(authenticated)/[orgSlug]/timesheet/_components/WorkLogDialog";
import { useProjectsForAttendance } from "@/modules/projects/hooks/useProjectsForAttendance";
import type { WorkLogFormValues } from "@/app/(authenticated)/[orgSlug]/timesheet/_components/WorkLogForm";
import type { WorkLogDialogState, LocalWorkLog } from "@/modules/attendance/types/bulkAttendanceTypes";
import type { BulkWorkLogItem } from "@/modules/attendance/types/bulkAttendanceTypes";

interface WorkLogHeatmapCardProps {
  orgSlug: string;
  memberId: string;
}

const CLOSED_DIALOG: WorkLogDialogState = { open: false, mode: "create", date: null, log: null };

function sumLogHours(logs: BulkWorkLogItem[]): number {
  return logs.reduce((sum, log) => {
    const start = new Date(log.startTime).getTime();
    const end = new Date(log.endTime).getTime();
    if (end <= start) return sum;
    return sum + (end - start) / 3_600_000;
  }, 0);
}

export function WorkLogHeatmapCard({ orgSlug, memberId }: Readonly<WorkLogHeatmapCardProps>) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [dialogState, setDialogState] = useState<WorkLogDialogState>(CLOSED_DIALOG);
  const [isSavingDialog, setIsSavingDialog] = useState(false);

  const rangeFrom = format(subMonths(month, 3), "yyyy-MM-dd");
  const rangeTo = format(endOfMonth(month), "yyyy-MM-dd");

  const { data: rangeData } = useBulkAttendanceRangeQuery(orgSlug, memberId, rangeFrom, rangeTo);
  const { data: holidays = [] } = useHolidays(orgSlug, memberId, { year: month.getFullYear() });
  const { data: leaveData } = useLeaveRequests(orgSlug, memberId, {
    status: "APPROVED",
    fromDate: rangeFrom,
    toDate: rangeTo,
    page: 1,
    pageSize: 100,
  });
  const { data: projects = [] } = useProjectsForAttendance(orgSlug, memberId);
  const { dayMap, saveDayLogs, optimisticUpdateDay, rollbackDay } = useBulkAttendanceData(orgSlug, memberId);

  const holidayDates = useMemo(() => new Set(holidays.filter((h) => h.isHoliday).map((h) => h.holidayDate.slice(0, 10))), [holidays]);

  const leaveDates = useMemo(() => {
    const set = new Set<string>();
    if (leaveData?.items) {
      for (const leave of leaveData.items) {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          set.add(format(d, "yyyy-MM-dd"));
        }
      }
    }
    return set;
  }, [leaveData]);

  const dayTotals = useMemo(() => {
    const map = new Map<string, number>();
    if (!rangeData?.days) return map;
    for (const day of rangeData.days) {
      map.set(day.date, sumLogHours(day.logs));
    }
    return map;
  }, [rangeData]);

  const offDayDates = useMemo(() => {
    const set = new Set<string>();
    for (const d of holidayDates) set.add(d);
    for (const d of leaveDates) set.add(d);
    return set;
  }, [holidayDates, leaveDates]);

  const modifiers = useMemo(() => {
    const m: Record<string, Matcher> = {};
    const offDaysArray = Array.from(offDayDates).map((d) => new Date(d + "T00:00:00"));
    if (offDaysArray.length > 0) m.offDays = offDaysArray;
    return m;
  }, [offDayDates]);

  const modifiersStyles: Record<string, React.CSSProperties> = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (modifiers.offDays) {
      styles.offDays = { backgroundColor: "rgba(234,67,53,0.12)", color: "#991b1b", borderRadius: "4px" };
    }
    return styles;
  }, [modifiers]);

  function getDayStyle(day: Date, isToday: boolean): React.CSSProperties {
    const dateStr = format(day, "yyyy-MM-dd");
    const todayRing = isToday ? `0 0 0 1.5px` : undefined;
    if (offDayDates.has(dateStr)) {
      return {
        backgroundColor: "rgba(234,67,53,0.12)", color: "#991b1b", borderRadius: "4px",
        ...(todayRing ? { boxShadow: `${todayRing} rgba(234,67,53,0.5)` } : {}),
      };
    }
    const total = dayTotals.get(dateStr) ?? 0;
    if (total === 0) return {
      color: "#a3a3a3", borderRadius: "4px",
      ...(todayRing ? { boxShadow: `${todayRing} #a3a3a3`, fontWeight: 600 } : {}),
    };
    if (total < 4) return {
      backgroundColor: "rgba(22,163,74,0.08)", color: "#166534", borderRadius: "4px",
      ...(todayRing ? { boxShadow: `${todayRing} rgba(22,163,74,0.4)` } : {}),
    };
    if (total <= 8) return {
      backgroundColor: "rgba(22,163,74,0.25)", color: "#14532d", borderRadius: "4px",
      ...(todayRing ? { boxShadow: `${todayRing} rgba(22,163,74,0.5)` } : {}),
    };
    return {
      backgroundColor: "rgba(22,163,74,0.6)", color: "#052e16", borderRadius: "4px", fontWeight: 600,
      ...(todayRing ? { boxShadow: `${todayRing} rgba(22,163,74,0.7)` } : {}),
    };
  }

  function handleDayClick(day: Date) {
    const dateStr = format(day, "yyyy-MM-dd");
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60_000);
    setDialogState({
      open: true,
      mode: "create",
      date: dateStr,
      log: {
        id: crypto.randomUUID(),
        startTime: start,
        endTime: end,
        projectId: null,
        projectTaskId: null,
        title: null,
        notes: null,
        isOptimistic: true,
      },
    });
  }

  const handleDialogSave = useCallback(
    async (date: string, values: WorkLogFormValues) => {
      setIsSavingDialog(true);
      const currentDay = dayMap.get(date) ?? null;
      const snapshot = currentDay ? { ...currentDay, logs: [...(currentDay.logs ?? [])] } : null;
      const existingLogs = currentDay?.logs ?? [];

      const newLog: LocalWorkLog = {
        id: crypto.randomUUID(),
        startTime: values.startTime,
        endTime: values.endTime,
        projectId: values.projectId,
        projectTaskId: values.projectTaskId,
        title: null,
        notes: values.notes,
        isOptimistic: true,
      };

      const finalLogs = [...existingLogs, newLog].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      optimisticUpdateDay(date, () => ({
        date,
        attendanceRecordId: currentDay?.attendanceRecordId ?? null,
        clockIn: currentDay?.clockIn ?? null,
        clockOut: currentDay?.clockOut ?? null,
        totalHours: currentDay?.totalHours ?? null,
        overtimeHours: currentDay?.overtimeHours ?? null,
        status: currentDay?.status ?? null,
        logs: finalLogs,
      }));

      try {
        await saveDayLogs(date, finalLogs);
        setDialogState(CLOSED_DIALOG);
        toast.success("Work log saved");
      } catch (err: unknown) {
        rollbackDay(date, snapshot);
        toast.error((err as { message?: string }).message ?? "Failed to save");
      } finally {
        setIsSavingDialog(false);
      }
    },
    [dayMap, optimisticUpdateDay, rollbackDay, saveDayLogs],
  );

  return (
    <section className="bg-surface rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <div className="px-6 py-5 border-b border-black/[0.04] flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-neutral-900 tracking-tight">Heatmap</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="inline-flex size-7 items-center justify-center rounded-md border border-neutral-200 bg-surface text-neutral-700 hover:bg-neutral-50 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="text-xs font-semibold text-neutral-900 min-w-[100px] text-center">{format(month, "MMMM yyyy")}</span>
          <button
            type="button"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="inline-flex size-7 items-center justify-center rounded-md border border-neutral-200 bg-surface text-neutral-700 hover:bg-neutral-50 transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="p-5 bg-surface">

        <Calendar
          month={month}
          onMonthChange={setMonth}
          onDayClick={(day) => handleDayClick(day)}
          className="w-full"
          classNames={{
            root: "w-full",
            months: "flex w-full flex-col",
            month: "mx-auto flex w-fit flex-col gap-2",
            month_caption: "hidden",
            month_grid: "mx-auto border-separate border-spacing-0.5",
            weekdays: "",
            weekday: "h-7 w-9 px-0 text-center text-[10px] font-semibold text-neutral-500 uppercase tracking-wider",
            weeks: "",
            week: "",
            day: "p-0 text-center align-middle",
            today: "",
            outside: "text-neutral-300",
            disabled: "text-neutral-200 cursor-not-allowed",
          }}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          components={{
            DayButton: (props) => {
              const { day, modifiers: dayModifiers, ...rest } = props;
              return (
                <button
                  {...rest}
                  type="button"
                  style={getDayStyle(day.date, dayModifiers.today)}
                  className={[
                    "relative inline-flex size-9 items-center justify-center text-xs rounded-md transition-colors cursor-pointer",
                    dayModifiers.outside ? "text-neutral-300" : "",
                    dayModifiers.disabled ? "text-neutral-200 cursor-not-allowed" : "",
                    dialogState.open && dialogState.date === format(day.date, "yyyy-MM-dd") ? "ring-2 ring-primary" : "",
                  ].join(" ")}
                >
                  {day.date.getDate()}
                </button>
              );
            },
          }}
          fromDate={subMonths(month, 3)}
          toDate={endOfMonth(month)}
        />

        <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-neutral-500">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-canvas border border-neutral-200" /> 0h</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ backgroundColor: "rgba(22,163,74,0.08)" }} /> &lt;4h</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ backgroundColor: "rgba(22,163,74,0.25)" }} /> 4–8h</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ backgroundColor: "rgba(22,163,74,0.6)" }} /> &gt;8h</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ backgroundColor: "rgba(234,67,53,0.12)" }} /> Leave</span>
        </div>

      </div>

      <WorkLogDialog
        state={dialogState}
        projects={projects}
        onClose={() => setDialogState(CLOSED_DIALOG)}
        onSave={handleDialogSave}
        isPending={isSavingDialog}
      />
    </section>
  );
}
