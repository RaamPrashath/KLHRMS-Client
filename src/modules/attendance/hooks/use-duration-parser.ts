'use client';

/**
 * Duration parser and formatter for the bulk attendance work-log form.
 *
 * Supports common human input variants:
 *   2h, 2.5h, 1hr, 4.6hrs, 2hrs 40mins, 2hrs 40m, 20mins, 30 min,
 *   90m, 1h 30m, 2.25, 2 hours, 1 hour 20 minutes, 45 minute, 15 m,
 *   1 day, 2 days, 2.5 d
 *
 * Internally normalizes to total minutes. One day is one 8-hour workday.
 */

export const WORKDAY_START_HOUR = 10;
export const WORKDAY_END_HOUR = 18;
export const WORKDAY_MINUTES = (WORKDAY_END_HOUR - WORKDAY_START_HOUR) * 60;

export type DurationUnit = 'time' | 'day' | 'bare';

export interface ParsedDuration {
  minutes: number;
  unit: DurationUnit;
}

export interface WorkdayDurationSegment {
  date: string;
  startTime: Date;
  endTime: Date;
}

function sumMatches(input: string, pattern: RegExp): number {
  let total = 0;
  for (const match of input.matchAll(pattern)) {
    const value = Number.parseFloat(match[1] ?? '');
    if (Number.isFinite(value)) total += value;
  }
  return total;
}

function formatDecimal(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, '');
}

function dateToYMD(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function workdayStartFor(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), WORKDAY_START_HOUR, 0, 0, 0);
}

function workdayEndFor(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), WORKDAY_END_HOUR, 0, 0, 0);
}

function nextWorkdayStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, WORKDAY_START_HOUR, 0, 0, 0);
}

export function normalizeToWorkdayWindow(start: Date): Date {
  const dayStart = workdayStartFor(start);
  const dayEnd = workdayEndFor(start);

  if (start < dayStart || start >= dayEnd) return dayStart;
  return start;
}

/**
 * Parse a human-readable duration string into total minutes with unit metadata.
 * Day units are normalized as 8 working hours.
 */
export function parseDurationInput(input: string): ParsedDuration | null {
  if (!input || !input.trim()) return null;

  const s = input.trim().toLowerCase();

  const dayPattern = /(\d+(?:\.\d+)?)\s*(?:days?|d)\b/g;
  const hourPattern = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/g;
  const minPattern = /(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b/g;

  const days = sumMatches(s, dayPattern);
  const hours = sumMatches(s, hourPattern);
  const mins = sumMatches(s, minPattern);

  if (days > 0 || hours > 0 || mins > 0) {
    const total = Math.round(days * WORKDAY_MINUTES + hours * 60 + mins);
    return total > 0 ? { minutes: total, unit: days > 0 ? 'day' : 'time' } : null;
  }

  const bareNumber = /^(\d+(?:\.\d+)?)$/.exec(s);
  if (bareNumber) {
    const hours = Number.parseFloat(bareNumber[1]!);
    const total = Math.round(hours * 60);
    return total > 0 ? { minutes: total, unit: 'bare' } : null;
  }

  return null;
}

/**
 * Parse a human-readable duration string into total minutes.
 * Returns null if the string cannot be parsed.
 */
export function parseDurationToMinutes(input: string): number | null {
  return parseDurationInput(input)?.minutes ?? null;
}

/**
 * Format total minutes into a human-readable duration string.
 */
export function formatMinutesToDuration(
  totalMinutes: number,
  options?: { preferDays?: boolean },
): string {
  if (totalMinutes <= 0) return '0 mins';

  if (options?.preferDays) {
    const days = totalMinutes / WORKDAY_MINUTES;
    return `${formatDecimal(days)} ${days === 1 ? 'day' : 'days'}`;
  }

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0 && m > 0) {
    return `${h} ${h === 1 ? 'hr' : 'hrs'} ${m} ${m === 1 ? 'min' : 'mins'}`;
  }
  if (h > 0) {
    return `${h} ${h === 1 ? 'hr' : 'hrs'}`;
  }
  return `${m} ${m === 1 ? 'min' : 'mins'}`;
}

/**
 * Given a start time (Date) and duration in minutes, compute the end time.
 */
export function addMinutesToDate(start: Date, minutes: number): Date {
  return new Date(start.getTime() + minutes * 60_000);
}

/**
 * Add working minutes across 10:00-18:00 calendar days.
 */
export function addWorkdayMinutesToDate(start: Date, minutes: number): Date {
  const segments = splitWorkdayMinutes(start, minutes);
  return segments.at(-1)?.endTime ?? normalizeToWorkdayWindow(start);
}

/**
 * Split working minutes into day-bounded 10:00-18:00 segments.
 */
export function splitWorkdayMinutes(start: Date, minutes: number): WorkdayDurationSegment[] {
  let remaining = Math.max(0, Math.round(minutes));
  let cursor = normalizeToWorkdayWindow(start);
  const segments: WorkdayDurationSegment[] = [];
  let guard = 0;

  while (remaining > 0 && guard < 400) {
    guard += 1;

    const dayEnd = workdayEndFor(cursor);
    const available = Math.max(0, Math.round((dayEnd.getTime() - cursor.getTime()) / 60_000));

    if (available <= 0) {
      cursor = nextWorkdayStart(cursor);
      continue;
    }

    const segmentMinutes = Math.min(remaining, available);
    const endTime = addMinutesToDate(cursor, segmentMinutes);
    segments.push({
      date: dateToYMD(cursor),
      startTime: cursor,
      endTime,
    });

    remaining -= segmentMinutes;
    cursor = nextWorkdayStart(cursor);
  }

  return segments;
}

/**
 * Compute the duration in minutes between two Date objects.
 * Returns 0 if end <= start.
 */
export function computeDurationMinutes(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diff / 60_000));
}

export interface UseDurationParserReturn {
  parseDurationInput: (input: string) => ParsedDuration | null;
  parseDurationToMinutes: (input: string) => number | null;
  formatMinutesToDuration: (
    totalMinutes: number,
    options?: { preferDays?: boolean },
  ) => string;
  addMinutesToDate: (start: Date, minutes: number) => Date;
  addWorkdayMinutesToDate: (start: Date, minutes: number) => Date;
  computeDurationMinutes: (start: Date, end: Date) => number;
}

export function useDurationParser(): UseDurationParserReturn {
  return {
    parseDurationInput,
    parseDurationToMinutes,
    formatMinutesToDuration,
    addMinutesToDate,
    addWorkdayMinutesToDate,
    computeDurationMinutes,
  };
}
