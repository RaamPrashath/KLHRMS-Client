import { describe, expect, it } from 'vitest';

import {
  parseDurationInput,
  splitWorkdayMinutes,
  WORKDAY_MINUTES,
} from './use-duration-parser';

describe('duration parser', () => {
  it('treats day units as 8-hour workdays', () => {
    expect(parseDurationInput('2.5 d')).toEqual({
      minutes: 2.5 * WORKDAY_MINUTES,
      unit: 'day',
    });
    expect(parseDurationInput('2 days')).toEqual({
      minutes: 2 * WORKDAY_MINUTES,
      unit: 'day',
    });
    expect(parseDurationInput('4 day')).toEqual({
      minutes: 4 * WORKDAY_MINUTES,
      unit: 'day',
    });
  });

  it('keeps bare numbers as hours', () => {
    expect(parseDurationInput('5')).toEqual({
      minutes: 5 * 60,
      unit: 'bare',
    });
  });

  it('splits day durations across 10:00-18:00 workdays', () => {
    const segments = splitWorkdayMinutes(new Date(2026, 5, 10, 14, 0, 0, 0), 2 * WORKDAY_MINUTES);

    expect(segments).toHaveLength(3);
    expect(segments.map((segment) => ({
      date: segment.date,
      startHour: segment.startTime.getHours(),
      endHour: segment.endTime.getHours(),
    }))).toEqual([
      { date: '2026-06-10', startHour: 14, endHour: 18 },
      { date: '2026-06-11', startHour: 10, endHour: 18 },
      { date: '2026-06-12', startHour: 10, endHour: 14 },
    ]);
  });
});
