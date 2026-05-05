'use client';

/**
 * Duration parser and formatter for the bulk attendance work-log form.
 *
 * Supports all common human input variants:
 *   2h, 2.5h, 1hr, 4.6hrs, 2hrs 40mins, 2hrs 40m, 20mins, 30 min,
 *   90m, 1h 30m, 2.25, 2 hours, 1 hour 20 minutes, 45 minute, 15 m
 *
 * Internally normalizes to total minutes.
 */

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parse a human-readable duration string into total minutes.
 * Returns null if the string cannot be parsed.
 */
export function parseDurationToMinutes(input: string): number | null {
  if (!input || !input.trim()) return null;

  const s = input.trim().toLowerCase();

  // Pattern: optional hours part + optional minutes part
  // Hours: decimal number followed by h/hr/hrs/hour/hours
  // Minutes: decimal number followed by m/min/mins/minute/minutes
  // Also handles bare decimal like "2.5" (treated as hours)

  const hourPattern = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)/;
  const minPattern = /(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)/;

  const hourMatch = hourPattern.exec(s);
  const minMatch = minPattern.exec(s);

  if (hourMatch || minMatch) {
    const hours = hourMatch ? parseFloat(hourMatch[1]!) : 0;
    const mins = minMatch ? parseFloat(minMatch[1]!) : 0;
    const total = Math.round(hours * 60 + mins);
    return total > 0 ? total : null;
  }

  // Bare decimal or integer — treat as hours
  const bareNumber = /^(\d+(?:\.\d+)?)$/.exec(s);
  if (bareNumber) {
    const hours = parseFloat(bareNumber[1]!);
    const total = Math.round(hours * 60);
    return total > 0 ? total : null;
  }

  return null;
}

/**
 * Format total minutes into a human-readable duration string.
 * Examples:
 *   90  → "1 hr 30 mins"
 *   120 → "2 hrs"
 *   45  → "45 mins"
 *   30  → "30 mins"
 */
export function formatMinutesToDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0 mins';
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
 * Compute the duration in minutes between two Date objects.
 * Returns 0 if end <= start.
 */
export function computeDurationMinutes(start: Date, end: Date): number {
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.round(diff / 60_000));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseDurationParserReturn {
  parseDurationToMinutes: (input: string) => number | null;
  formatMinutesToDuration: (totalMinutes: number) => string;
  addMinutesToDate: (start: Date, minutes: number) => Date;
  computeDurationMinutes: (start: Date, end: Date) => number;
}

export function useDurationParser(): UseDurationParserReturn {
  return {
    parseDurationToMinutes,
    formatMinutesToDuration,
    addMinutesToDate,
    computeDurationMinutes,
  };
}
