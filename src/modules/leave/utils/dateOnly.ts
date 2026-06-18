export function dateOnlyToLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error(`Invalid date-only value: ${value}`);
  }
  return new Date(year, month - 1, day);
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateOnlyYear(value: string): number {
  return dateOnlyToLocalDate(value).getFullYear();
}

export function dateOnlyMonth(value: string): number {
  return dateOnlyToLocalDate(value).getMonth() + 1;
}
