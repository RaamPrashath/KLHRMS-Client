import type {
  AttendanceRecord,
  DerivedAttendanceSummary,
  ClockStatus,
} from '@/modules/attendance/types/attendanceTypes';

// ─── Timezone constant ────────────────────────────────────────────────────────
// All display formatting uses Asia/Kolkata (IST, UTC+5:30).
// Duration/elapsed math always uses raw millisecond differences — never
// formatted strings — so timezone never contaminates elapsed calculations.

const IST = 'Asia/Kolkata';

function hasTimezoneSuffix(isoDatetime: string): boolean {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(isoDatetime);
}

function parseAttendanceDate(isoDatetime: string): Date {
  if (hasTimezoneSuffix(isoDatetime)) {
    return new Date(isoDatetime);
  }

  const utcDate = new Date(`${isoDatetime}Z`);
  if (utcDate.getTime() > Date.now() + 60_000) {
    return new Date(isoDatetime);
  }
  return utcDate;
}

// ─── Core formatters ──────────────────────────────────────────────────────────

/**
 * Format an ISO datetime string for display in IST.
 * Returns "—" for null/empty.
 * Example: "2025-01-12T01:10:00Z" → "06:40 AM" (IST)
 */
export function formatTime(isoDatetime: string | null | undefined): string {
  if (!isoDatetime) return '—';
  try {
    // Normalize to UTC if no timezone suffix — prevents local-time misparse
    const parsedDate = parseAttendanceDate(isoDatetime);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: IST,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(parsedDate);
  } catch {
    return '—';
  }
}

/**
 * Format an ISO date string (YYYY-MM-DD) for display.
 * The date field from the backend is a calendar date, not a timestamp —
 * parse it as a local date to avoid UTC-midnight shift.
 * Example: "2025-01-12" → "12 Jan 2025"
 */
export function formatDate(isoDate: string): string {
  if (!isoDate) return '—';
  try {
    // Split to avoid UTC-midnight shift on date-only strings
    const [year, month, day] = isoDate.split('-').map(Number);
    const d = new Date(year!, month! - 1, day!);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoDate;
  }
}

/**
 * Format a numeric hours value to 1 decimal place.
 * Returns "—" for null.
 */
export function formatHours(hours: number | null | undefined): string {
  if (hours == null) return '—';
  return hours.toFixed(1);
}

/**
 * Get today's date string in IST as YYYY-MM-DD.
 * Used to determine whether a record belongs to "today" in India time.
 */
export function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Format today's date for display in the clock widget (IST).
 * Example: "Sunday, 12 January 2025"
 */
export function formatTodayLabel(): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

// ─── Elapsed duration ─────────────────────────────────────────────────────────

/**
 * Compute elapsed HH:MM:SS from a clock-in ISO timestamp to now.
 *
 * IMPORTANT: This is pure millisecond arithmetic — timezone is irrelevant.
 * The result is always the real elapsed duration, never offset by UTC+5:30.
 *
 * elapsedMs = Date.now() - new Date(clockInIso).getTime()
 */
export function formatElapsed(clockInIso: string): string {
  try {
    const elapsedMs = Date.now() - parseAttendanceDate(clockInIso).getTime();
    if (elapsedMs < 0) return '00:00:00';
    const totalSeconds = Math.floor(elapsedMs / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  } catch {
    return '00:00:00';
  }
}

/**
 * Format a worked duration in seconds as HH:MM:SS.
 * Used in the completed-day widget summary.
 */
export function formatWorkedDuration(totalHours: number | null | undefined): string {
  if (totalHours == null) return '—';
  const totalSeconds = Math.round(totalHours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

// ─── Summary derivation ───────────────────────────────────────────────────────

export function deriveSummary(items: AttendanceRecord[]): DerivedAttendanceSummary {
  const presentDays = items.filter((r) => r.status === 'PRESENT').length;
  const halfDays = items.filter((r) => r.status === 'HALF_DAY').length;
  const absentDays = items.filter((r) => r.status === 'ABSENT').length;
  const totalHours = items.reduce((sum, r) => sum + (r.totalHours ?? 0), 0);
  const overtimeHours = items.reduce((sum, r) => sum + (r.overtimeHours ?? 0), 0);

  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
  const latest = sorted[0];
  let clockStatus: ClockStatus = 'NO_RECORD';
  if (latest != null) {
    clockStatus =
      latest.clockIn != null && latest.clockOut == null ? 'CLOCKED_IN' : 'CLOCKED_OUT';
  }

  return { presentDays, halfDays, absentDays, totalHours, overtimeHours, clockStatus };
}
