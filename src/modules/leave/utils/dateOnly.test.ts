import { describe, expect, it } from "vitest";

import { dateOnlyMonth, dateOnlyToLocalDate, dateOnlyYear, localDateKey } from "./dateOnly";

describe("date-only helpers", () => {
  it("round-trips YYYY-MM-DD values without UTC conversion", () => {
    const date = dateOnlyToLocalDate("2026-06-17");

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(5);
    expect(date.getDate()).toBe(17);
    expect(localDateKey(date)).toBe("2026-06-17");
  });

  it("extracts year and month from local calendar dates", () => {
    expect(dateOnlyYear("2026-01-01")).toBe(2026);
    expect(dateOnlyMonth("2026-01-01")).toBe(1);
  });
});
