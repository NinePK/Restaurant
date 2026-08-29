import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { calculatePayroll } from "@/lib/hr";

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

function getMonthRange(year: number, month: number) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

async function buildPayrollRows(year: number, month: number) {
  const { start, end } = getMonthRange(year, month);
  const staff = await prisma.staffProfile.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      attendance: {
        where: {
          date: { gte: start, lt: end },
        },
      },
      payrolls: {
        where: { year, month },
        take: 1,
      },
    },
  });

  return staff.map((person) => {
    const calculated = calculatePayroll(person, person.attendance);
    const saved = person.payrolls[0] ?? null;
    return {
      staffProfile: {
        id: person.id,
        name: person.name,
        position: person.position,
        wageType: person.wageType,
        wageRate: person.wageRate,
      },
      ...calculated,
      saved,
    };
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month = Number(searchParams.get("month") || now.getMonth() + 1);
  const year = Number(searchParams.get("year") || now.getFullYear());

  const rows = await buildPayrollRows(year, month);
  return NextResponse.json({ month, year, rows });
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = await request.json();
  const month = Number(body.month);
  const year = Number(body.year);
  if (!month || !year) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });

  const rows = await buildPayrollRows(year, month);

  await prisma.$transaction(
    rows.map((row) =>
      prisma.payrollSummary.upsert({
        where: {
          staffProfileId_month_year: {
            staffProfileId: row.staffProfile.id,
            month,
            year,
          },
        },
        update: {
          totalDays: row.totalDays,
          totalHours: row.totalHours,
          totalWage: row.totalWage,
          netWage: row.netWage,
        },
        create: {
          staffProfileId: row.staffProfile.id,
          month,
          year,
          totalDays: row.totalDays,
          totalHours: row.totalHours,
          totalWage: row.totalWage,
          netWage: row.netWage,
        },
      })
    )
  );

  await writeAuditLog({
    userId: user.id,
    action: "GENERATE_PAYROLL",
    entityType: "PayrollSummary",
    newValue: { month, year, staffCount: rows.length },
  });

  return NextResponse.json({ success: true, month, year, rows });
}
