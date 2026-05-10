export function addMinutes(dateIso: string, minutes: number): Date {
  const date = new Date(dateIso);
  return new Date(date.getTime() + minutes * 60_000);
}

export function getYearMonth(dateIso: string): { year: number; month: number } {
  const date = new Date(dateIso);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function toUtcRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { start, end };
}
