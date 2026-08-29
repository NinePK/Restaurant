import { NextRequest, NextResponse } from "next/server";
import { WageType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const updateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  wageType: z.nativeEnum(WageType).optional(),
  wageRate: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const existing = await prisma.staffProfile.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });

  const body = await request.json();
  const parsed = updateStaffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const staff = await prisma.$transaction(async (tx) => {
    const updatedStaff = await tx.staffProfile.update({
      where: { id: params.id },
      data: parsed.data,
    });

    if (existing.userId && parsed.data.isActive !== undefined) {
      await tx.user.update({
        where: { id: existing.userId },
        data: { isActive: parsed.data.isActive },
      });
    }

    return updatedStaff;
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE_STAFF",
    entityType: "StaffProfile",
    entityId: staff.id,
    oldValue: existing,
    newValue: parsed.data,
  });

  return NextResponse.json(staff);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const existing = await prisma.staffProfile.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, username: true, role: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
  }

  if (existing.user?.role === "OWNER") {
    return NextResponse.json({ error: "ไม่สามารถลบเจ้าของร้านได้" }, { status: 403 });
  }

  if (existing.userId === user.id) {
    return NextResponse.json({ error: "ไม่สามารถลบรายชื่อที่กำลังใช้งานอยู่" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.staffProfile.delete({ where: { id: params.id } });

    if (existing.userId) {
      await tx.user.delete({ where: { id: existing.userId } });
    }
  });

  await writeAuditLog({
    userId: user.id,
    action: "DELETE_STAFF",
    entityType: "StaffProfile",
    entityId: existing.id,
    oldValue: {
      id: existing.id,
      name: existing.name,
      phone: existing.phone,
      position: existing.position,
      wageType: existing.wageType,
      wageRate: existing.wageRate,
      isActive: existing.isActive,
      username: existing.user?.username,
      role: existing.user?.role,
    },
  });

  return NextResponse.json({ success: true });
}
