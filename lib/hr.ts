import type { AttendanceLog, StaffProfile } from "@prisma/client";

export function dateOnlyToUtcDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function getCurrentMonthYear() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export function calculateHours(checkIn: Date | null, checkOut: Date | null) {
  if (!checkIn || !checkOut) return 0;
  return Math.max(0, (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60));
}

export function calculatePayroll(
  staff: Pick<StaffProfile, "wageType" | "wageRate">,
  attendance: Pick<AttendanceLog, "checkIn" | "checkOut" | "status">[]
) {
  const payableLogs = attendance.filter((log) => log.status === "PRESENT" || log.status === "LATE");
  const totalDays = payableLogs.length;
  const totalHours = payableLogs.reduce(
    (sum, log) => sum + calculateHours(log.checkIn, log.checkOut),
    0
  );

  let totalWage = 0;
  if (staff.wageType === "MONTHLY") totalWage = staff.wageRate;
  if (staff.wageType === "DAILY") totalWage = totalDays * staff.wageRate;
  if (staff.wageType === "HOURLY") totalWage = totalHours * staff.wageRate;

  return {
    totalDays,
    totalHours,
    totalWage,
    netWage: totalWage,
  };
}
