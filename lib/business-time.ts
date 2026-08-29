const BANGKOK_UTC_OFFSET_HOURS = 7;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateOnly(value: string) {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function startOfBangkokDay(value: string): Date {
  const dateOnly = parseDateOnly(value);
  if (!dateOnly) return new Date(value);

  return new Date(
    Date.UTC(
      dateOnly.year,
      dateOnly.month - 1,
      dateOnly.day,
      -BANGKOK_UTC_OFFSET_HOURS,
      0,
      0,
      0
    )
  );
}

export function endOfBangkokDay(value: string): Date {
  const dateOnly = parseDateOnly(value);
  if (!dateOnly) {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
  }

  return new Date(
    Date.UTC(
      dateOnly.year,
      dateOnly.month - 1,
      dateOnly.day + 1,
      -BANGKOK_UTC_OFFSET_HOURS,
      0,
      0,
      -1
    )
  );
}

export function formatBangkokDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : "";
}
