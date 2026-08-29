import { NextRequest, NextResponse } from "next/server";
import { AttendanceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { dateOnlyToUtcDate } from "@/lib/hr";
import { z } from "zod";

const attendanceActionSchema = z.object({
  staffProfileId: z.string().min(1),
  date: z.string().min(1),
  action: z.enum(["CHECK_IN", "CHECK_OUT", "LATE", "ABSENT", "LEAVE"]),
});

const attendanceUpdateSchema = z.object({
  id: z.string().min(1),
  status: z.nativeEnum(AttendanceStatus).optional(),
  note: z.string().optional().nullable(),
});

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const staffProfileId = searchParams.get("staffProfileId");

  const where: Record<string, unknown> = {};
  if (date) where.date = dateOnlyToUtcDate(date);
  if (staffProfileId) where.staffProfileId = staffProfileId;

  const attendance = await prisma.attendanceLog.findMany({
    where,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      staffProfile: true,
      editedBy: { select: { username: true } },
    },
  });

  return NextResponse.json(attendance);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER", "STAFF"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = attendanceActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const attendanceDate = dateOnlyToUtcDate(parsed.data.date);
  const now = new Date();

  const updateData =
    parsed.data.action === "CHECK_IN"
      ? { checkIn: now, status: "PRESENT" as const }
      : parsed.data.action === "CHECK_OUT"
        ? { checkOut: now }
        : parsed.data.action === "LATE"
          ? { checkIn: now, status: "LATE" as const }
        : parsed.data.action === "ABSENT"
          ? { status: "ABSENT" as const, checkIn: null, checkOut: null }
          : { status: "LEAVE" as const, checkIn: null, checkOut: null };

  const attendance = await prisma.attendanceLog.upsert({
    where: {
      staffProfileId_date: {
        staffProfileId: parsed.data.staffProfileId,
        date: attendanceDate,
      },
    },
    update: updateData,
    create: {
      staffProfileId: parsed.data.staffProfileId,
      date: attendanceDate,
      checkIn: parsed.data.action === "CHECK_IN" || parsed.data.action === "LATE" ? now : null,
      checkOut: parsed.data.action === "CHECK_OUT" ? now : null,
      status:
        parsed.data.action === "ABSENT"
          ? "ABSENT"
          : parsed.data.action === "LEAVE"
            ? "LEAVE"
            : parsed.data.action === "LATE"
              ? "LATE"
              : "PRESENT",
    },
    include: { staffProfile: true },
  });

  await writeAuditLog({
    userId: user.id,
    action: parsed.data.action,
    entityType: "AttendanceLog",
    entityId: attendance.id,
    newValue: parsed.data,
  });

  return NextResponse.json(attendance);
}

export async function PATCH(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = attendanceUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.attendanceLog.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบรายการเวลา" }, { status: 404 });

  const attendance = await prisma.attendanceLog.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      note: parsed.data.note,
      editedById: user.id,
    },
    include: { staffProfile: true },
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE_ATTENDANCE",
    entityType: "AttendanceLog",
    entityId: attendance.id,
    oldValue: existing,
    newValue: parsed.data,
  });

  return NextResponse.json(attendance);
}
