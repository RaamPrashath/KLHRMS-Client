"use client";

import { useCallback, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBulkAttendanceRangeQuery } from "@/modules/attendance/hooks/queries/attendance";
import { useBulkAttendanceData } from "@/modules/attendance/hooks/use-bulk-attendance-data";
import { useHolidays } from "@/modules/leave/hooks/useHolidays";
import { useLeaveRequests } from "@/modules/leave/hooks/useLeaveRequests";
import { dateOnlyToLocalDate } from "@/modules/leave/utils/dateOnly";
import { WorkLogDialog } from "@/app/(authenticated)/[orgSlug]/timesheet/_components/WorkLogDialog";
import { useProjectsForAttendance } from "@/modules/projects/hooks/useProjectsForAttendance";
import type { WorkLogFormValues } from "@/app/(authenticated)/[orgSlug]/timesheet/_components/WorkLogForm";
import type {
  BulkWorkLogItem,
  LocalWorkLog,
  WorkLogDialogState,
} from "@/modules/attendance/types/bulkAttendanceTypes";

interface WorkLogHeatmapCardProps {
  orgSlug: string;
  memberId: string;
  variant?: "default" | "employee";
}

const CLOSED_DIALOG: WorkLogDialogState = { open: false, mode: "create", date: null, log: null };
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type WorkLogWithTimeRange = Pick<BulkWorkLogItem, "startTime" | "endTime"> | Pick<LocalWorkLog, "startTime" | "endTime">;

function sumLogHours(logs: WorkLogWithTimeRange[]): number {
  return logs.reduce((sum, log) => {
    const start = new Date(log.startTime).getTime();
    const end = new Date(log.endTime).getTime();
    if (end <= start) return sum;
    return sum + (end - start) / 3_600_000;
  }, 0);
}

function buildClockedInLog(args: {
  clockIn: Date;
  clockOut: Date | null;
  sourceLog?: LocalWorkLog | null;
}): LocalWorkLog {
  const { clockIn, clockOut, sourceLog } = args;
  const start = clockIn;
  const end =
    clockOut && clockOut > start
      ? clockOut
      : new Date(start.getTime() + 60 * 60_000);

  return {
    id: sourceLog?.id ?? crypto.randomUUID(),
    startTime: start,
    endTime: end,
    projectId: sourceLog?.projectId ?? null,
    projectTaskId: sourceLog?.projectTaskId ?? null,
    title: sourceLog?.title ?? null,
    notes: sourceLog?.notes ?? null,
    isOptimistic: sourceLog?.isOptimistic ?? true,
  };
}

function chunkDays(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}

function getDayTone(totalHours: number, isOffDay: boolean) {
  if (isOffDay) {
    return {
      backgroundClassName: "bg-[#ffe9ec] text-[#bf3e4d]",
      legendLabel: "Holiday or time off",
    };
  }
  if (totalHours === 0) {
    return {
      backgroundClassName: "bg-[#eff2f6] text-[#8a94a6]",
      legendLabel: "No entry",
    };
  }
  if (totalHours < 5) {
    return {
      backgroundClassName: "bg-[#fde68a] text-[#92400e]",
      legendLabel: "Less than five hours logged",
    };
  }
  if (totalHours <= 8) {
    return {
      backgroundClassName: "bg-[#77e2b7] text-[#0f5f39]",
      legendLabel: "Five to eight hours logged",
    };
  }
  return {
    backgroundClassName: "bg-[#10b26c] text-white",
    legendLabel: "More than eight hours logged",
  };
}

function hydrateLocalWorkLog(log: BulkWorkLogItem): LocalWorkLog {
  return {
    id: log.id,
    startTime: new Date(log.startTime),
    endTime: new Date(log.endTime),
    projectId: log.projectId ?? null,
    projectTaskId: log.projectTaskId ?? null,
    title: log.title ?? null,
    notes: log.notes ?? null,
    isOptimistic: false,
  };
}

export function WorkLogHeatmapCard({
  orgSlug,
  memberId,
  variant = "default",
}: Readonly<WorkLogHeatmapCardProps>) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [dialogState, setDialogState] = useState<WorkLogDialogState>(CLOSED_DIALOG);
  const [isSavingDialog, setIsSavingDialog] = useState(false);
  const isEmployeeVariant = variant === "employee";

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

  const holidayDates = useMemo(
    () => new Set(holidays.filter((holiday) => holiday.isHoliday).map((holiday) => holiday.holidayDate.slice(0, 10))),
    [holidays],
  );

  const leaveDates = useMemo(() => {
    const set = new Set<string>();
    if (leaveData?.items) {
      for (const leave of leaveData.items) {
        const start = dateOnlyToLocalDate(leave.startDate);
        const end = dateOnlyToLocalDate(leave.endDate);
        for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
          set.add(format(day, "yyyy-MM-dd"));
        }
      }
    }
    return set;
  }, [leaveData]);

  const dayTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const day of rangeData?.days ?? []) {
      const logHours = sumLogHours(day.logs ?? []);
      totals.set(day.date, logHours > 0 ? logHours : (day.totalHours ?? 0));
    }
    for (const [date, day] of dayMap.entries()) {
      const logHours = sumLogHours(day?.logs ?? []);
      totals.set(date, logHours > 0 ? logHours : (day?.totalHours ?? 0));
    }
    return totals;
  }, [dayMap, rangeData]);

  const rangeDaysByDate = useMemo(
    () => new Map((rangeData?.days ?? []).map((day) => [day.date, day])),
    [rangeData],
  );

  const offDayDates = useMemo(() => {
    const set = new Set<string>();
    for (const date of holidayDates) set.add(date);
    for (const date of leaveDates) set.add(date);
    return set;
  }, [holidayDates, leaveDates]);

  const calendarWeeks = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    return chunkDays(eachDayOfInterval({ start: gridStart, end: gridEnd }));
  }, [month]);

  function handleDayClick(day: Date) {
    if (!isSameMonth(day, month)) return;
    const dateStr = format(day, "yyyy-MM-dd");
    const currentDay = dayMap.get(dateStr) ?? null;
    const rangeDay = rangeDaysByDate.get(dateStr);
    const rangeLogs = (rangeDay?.logs ?? []).map(hydrateLocalWorkLog);
    const existingLogs = currentDay?.logs ?? rangeLogs;
    const sourceLog = existingLogs[0] ?? null;
    const resolvedClockIn =
      currentDay?.clockIn ?? (rangeDay?.clockIn ? new Date(rangeDay.clockIn) : null);
    const resolvedClockOut =
      currentDay?.clockOut ?? (rangeDay?.clockOut ? new Date(rangeDay.clockOut) : null);

    let preparedLog: LocalWorkLog | null = null;
    if (sourceLog) {
      preparedLog = sourceLog;
    } else if (resolvedClockIn) {
      preparedLog = buildClockedInLog({
        clockIn: resolvedClockIn,
        clockOut: resolvedClockOut,
      });
    }

    setDialogState({
      open: true,
      mode: sourceLog ? "edit" : "create",
      date: dateStr,
      log: preparedLog,
    });
  }

  const handleDialogSave = useCallback(
    async (date: string, values: WorkLogFormValues) => {
      setIsSavingDialog(true);
      const currentDay = dayMap.get(date) ?? null;
      const rangeDay = rangeDaysByDate.get(date);
      const fallbackLogs = (rangeDay?.logs ?? []).map(hydrateLocalWorkLog);
      const existingLogs = currentDay?.logs ?? fallbackLogs;
      const snapshot = currentDay ? { ...currentDay, logs: [...(currentDay.logs ?? [])] } : null;

      const newLog: LocalWorkLog = {
        id:
          dialogState.mode === "edit" && dialogState.log
            ? dialogState.log.id
            : crypto.randomUUID(),
        startTime: values.startTime,
        endTime: values.endTime,
        projectId: values.projectId,
        projectTaskId: values.projectTaskId,
        title: null,
        notes: values.notes,
        isOptimistic: true,
      };

      const finalLogs = (
        dialogState.mode === "edit" && dialogState.log
          ? (
              existingLogs.some((log) => log.id === dialogState.log!.id)
                ? existingLogs.map((log) => (log.id === dialogState.log!.id ? newLog : log))
                : [newLog]
            )
          : [...existingLogs, newLog]
      ).sort((left, right) => left.startTime.getTime() - right.startTime.getTime());

      optimisticUpdateDay(date, () => ({
        date,
        attendanceRecordId: currentDay?.attendanceRecordId ?? rangeDay?.attendanceRecordId ?? null,
        clockIn: currentDay?.clockIn ?? (rangeDay?.clockIn ? new Date(rangeDay.clockIn) : null),
        clockOut: currentDay?.clockOut ?? (rangeDay?.clockOut ? new Date(rangeDay.clockOut) : null),
        totalHours: currentDay?.totalHours ?? rangeDay?.totalHours ?? null,
        overtimeHours: currentDay?.overtimeHours ?? rangeDay?.overtimeHours ?? null,
        status: currentDay?.status ?? rangeDay?.status ?? null,
        logs: finalLogs,
      }));

      try {
        await saveDayLogs(date, finalLogs);
        setDialogState(CLOSED_DIALOG);
        toast.success("Work log saved");
      } catch (error: unknown) {
        rollbackDay(date, snapshot);
        toast.error((error as { message?: string }).message ?? "Failed to save");
      } finally {
        setIsSavingDialog(false);
      }
    },
    [dayMap, dialogState.log, dialogState.mode, optimisticUpdateDay, rangeDaysByDate, rollbackDay, saveDayLogs],
  );

  return (
    <section
      className="flex h-full w-full flex-col bg-transparent border-none p-0"
    >
      <div
        className={cn(
          isEmployeeVariant
            ? "flex items-start justify-between gap-4"
            : "flex items-start justify-between gap-4",
        )}
      >
        <div className={cn(isEmployeeVariant ? "space-y-1" : "space-y-1")}>
          <h2
            className={cn(
              "font-semibold tracking-tight text-neutral-900",
              isEmployeeVariant ? "text-[17px]" : "text-[15px]",
            )}
          >
            Heatmap
          </h2>
        </div>
        <div
          className={cn(
            "flex items-center",
            isEmployeeVariant ? "gap-2" : "gap-3",
          )}
        >
          <button
            type="button"
            onClick={() => setMonth((currentMonth) => subMonths(currentMonth, 1))}
            className={cn(
              "inline-flex items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-black/[0.04]",
              isEmployeeVariant
                ? "size-10 rounded-[14px] border border-[#d9e3f0] bg-white text-[#64748b] shadow-[0_6px_16px_rgba(15,23,42,0.04)] hover:bg-[#f7f9fc]"
                : "size-8 rounded-xl border border-[#dce5f0] bg-white text-[#7b8ca7] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-[#f8fafc]",
            )}
            aria-label="Previous month"
          >
            <ArrowLeft className={cn(isEmployeeVariant ? "size-3.5" : "size-3.5")} />
          </button>
          {!isEmployeeVariant ? (
            <span className="min-w-[4.75rem] text-center text-[14px] font-semibold text-[#365887]">
              {format(month, "MMM ''yy")}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setMonth((currentMonth) => addMonths(currentMonth, 1))}
            className={cn(
              "inline-flex items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-black/[0.04]",
              isEmployeeVariant
                ? "size-10 rounded-[14px] border border-[#d9e3f0] bg-white text-[#64748b] shadow-[0_6px_16px_rgba(15,23,42,0.04)] hover:bg-[#f7f9fc]"
                : "size-8 rounded-xl border border-[#dce5f0] bg-white text-[#7b8ca7] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-[#f8fafc]",
            )}
            aria-label="Next month"
          >
            <ArrowRight className={cn(isEmployeeVariant ? "size-3.5" : "size-3.5")} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col",
          isEmployeeVariant ? "mt-5 w-full min-h-0" : "mt-6 w-full min-h-0",
        )}
      >
        <div
          className={cn(
            "grid grid-cols-7",
            isEmployeeVariant
              ? "px-2 text-[13px] text-[#94a3b8] gap-2"
              : "mb-2 gap-2 text-[12px] text-[#8fa1bb]",
          )}
        >
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className={cn("text-center font-medium", isEmployeeVariant ? "py-1 tracking-[0.01em]" : "py-1")}
            >
              {isEmployeeVariant ? label : label.slice(0, 1)}
            </div>
          ))}
        </div>

        <div
          className={cn("grid", isEmployeeVariant ? "mt-3 gap-2" : "mt-1 gap-2")}
          style={{ gridTemplateRows: `repeat(${calendarWeeks.length}, minmax(0, 1fr))` }}
        >
          {calendarWeeks.map((week) => (
            <div
              key={format(week[0], "yyyy-MM-dd")}
              className={cn("grid grid-cols-7", isEmployeeVariant ? "gap-2" : "gap-2")}
            >
              {week.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                if (!isSameMonth(day, month)) {
                  return (
                    <div
                      key={dateStr}
                      className="aspect-square w-full"
                      aria-hidden="true"
                    />
                  );
                }

                const isSelected = dialogState.open && dialogState.date === dateStr;
                const isCurrentDay = isToday(day);
                const totalHours = dayTotals.get(dateStr) ?? 0;
                const tone = getDayTone(totalHours, offDayDates.has(dateStr));

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    aria-label={`${format(day, "PPP")}, ${tone.legendLabel}`}
                    className={cn(
                      "relative flex aspect-square w-full items-center justify-center border border-transparent text-sm font-medium transition-transform duration-150 ease-out hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      isEmployeeVariant
                        ? "rounded-[18px] border border-[#dfe7f2] text-[21px] font-semibold shadow-[0_10px_24px_rgba(15,23,42,0.04),inset_0_1px_0_rgba(255,255,255,0.5)]"
                        : "rounded-[9px] border border-[#e5ebf3] text-[12px] font-medium shadow-none",
                      tone.backgroundClassName,
                      !isEmployeeVariant && isCurrentDay && !isSelected ? "border-[#5b57ff] bg-white text-[#0f172a] shadow-[inset_0_0_0_2px_#5b57ff]" : "",
                      isCurrentDay && isEmployeeVariant && !isSelected ? "shadow-[inset_0_0_0_1.5px_rgba(76,132,255,0.65)]" : "",
                      isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-[#fbfcfe]" : "",
                    )}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div
          className={cn(
            "flex flex-wrap items-center text-neutral-500",
            isEmployeeVariant
              ? "mt-5 justify-start gap-x-4 gap-y-2 text-[12px]"
              : "mt-6 grid grid-cols-2 gap-x-10 gap-y-2 border-t border-[#edf1f6] pt-4 text-[11px]",
          )}
        >
          <span className="flex items-center gap-1.5">
            <span
              className={cn("bg-[#10b26c]", isEmployeeVariant ? "size-3 rounded-full" : "size-3 rounded-[6px]")}
            />
            8h+
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={cn("bg-[#77e2b7]", isEmployeeVariant ? "size-3 rounded-full" : "size-3 rounded-[6px]")}
            />
            5–8h
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={cn("bg-[#fde68a]", isEmployeeVariant ? "size-3 rounded-full" : "size-3 rounded-[6px]")}
            />
            &lt;5h
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={cn("bg-[#eff2f6]", isEmployeeVariant ? "size-3 rounded-full" : "size-3 rounded-[6px]")}
            />
            No entry
          </span>
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
