import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  isSameMonth,
  startOfISOWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export interface WeekState {
  year: number;
  week: number;
}

export interface MonthState {
  year: number;
  month: number;
}

export interface WeekDayItem {
  iso: string;
  label: string;
  date: Date;
}

export interface MonthDayItem {
  iso: string;
  date: Date;
  isWeekend: boolean;
  isCurrentMonth: boolean;
}

export function getCurrentWeekState(): WeekState {
  const now = new Date();
  return { year: getISOWeekYear(now), week: getISOWeek(now) };
}

export function getCurrentMonthState(): MonthState {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function getWeekStart(year: number, week: number): Date {
  return startOfISOWeek(dateFromIsoWeek(year, week));
}

export function getWeekDays(year: number, week: number): WeekDayItem[] {
  const monday = getWeekStart(year, week);
  return Array.from({ length: 5 }, (_, index) => {
    const date = addDays(monday, index);
    return {
      iso: format(date, "yyyy-MM-dd"),
      label: `${format(date, "EEE")} ${format(date, "d")}`,
      date,
    };
  });
}

export function shiftWeek(year: number, week: number, delta: number): WeekState {
  const next = addWeeks(getWeekStart(year, week), delta);
  return { year: getISOWeekYear(next), week: getISOWeek(next) };
}

export function getWeekRangeLabel(year: number, week: number): string {
  const monday = getWeekStart(year, week);
  const friday = addDays(monday, 4);
  return `${format(monday, "MMM d")} - ${format(friday, "d")}`;
}

export function getMonthLabel(year: number, month: number): string {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

export function shiftMonth(year: number, month: number, delta: number): MonthState {
  const next = addMonths(new Date(year, month - 1, 1), delta);
  return { year: next.getFullYear(), month: next.getMonth() + 1 };
}

export function getMonthWeekRows(year: number, month: number): MonthDayItem[][] {
  const monthDate = new Date(year, month - 1, 1);
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const rows: MonthDayItem[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    rows.push(
      days.slice(index, index + 7).map((date) => ({
        iso: format(date, "yyyy-MM-dd"),
        date,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isCurrentMonth: isSameMonth(date, monthDate),
      })),
    );
  }
  return rows;
}

export function getMonthWeekdayDates(year: number, month: number): string[] {
  return getMonthWeekRows(year, month)
    .flat()
    .filter((day) => day.isCurrentMonth && !day.isWeekend)
    .map((day) => day.iso);
}

function dateFromIsoWeek(year: number, week: number): Date {
  const januaryFourth = new Date(year, 0, 4);
  return addWeeks(startOfISOWeek(januaryFourth), week - 1);
}
