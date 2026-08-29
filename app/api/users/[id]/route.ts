import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { allPermissions } from "@/lib/permissions";

const updateUserSchema = z.object({
  username: z.string().trim().min(3).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  role: z.nativeEnum(Role).optional(),
  permissions: z.array(z.enum(allPermissions as [string, ...string[]])).optional(),
  isActive: z.boolean().optional(),
});

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

function canManageAccounts(role: string) {
  return ["OWNER", "MANAGER"].includes(role);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(request);
  if (!user || !canManageAccounts(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: params.id },
    include: { staffProfile: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 404 });
  }

  if (existing.role === "OWNER" && user.role !== "OWNER") {
    return NextResponse.json({ error: "แก้ไขบัญชีเจ้าของร้านได้เฉพาะเจ้าของร้าน" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลบัญชีไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const { password, ...data } = parsed.data;
  if (data.role === "OWNER" && user.role !== "OWNER") {
    return NextResponse.json({ error: "ตั้งเป็นเจ้าของร้านได้เฉพาะเจ้าของร้าน" }, { status: 403 });
  }

  const updateData = {
    ...data,
    ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
  };

  const updated = await prisma.user
    .update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        staffProfile: { select: { id: true, name: true, position: true } },
      },
    })
    .catch((error) => {
      if (error?.code === "P2002") return null;
      throw error;
    });

  if (!updated) {
    return NextResponse.json({ error: "username นี้ถูกใช้แล้ว" }, { status: 409 });
  }

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE_USER_ACCOUNT",
    entityType: "User",
    entityId: params.id,
    oldValue: {
      username: existing.username,
      role: existing.role,
      permissions: existing.permissions,
      isActive: existing.isActive,
    },
    newValue: { ...data, passwordChanged: Boolean(password) },
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(request);
  if (!user || !canManageAccounts(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  if (user.id === params.id) {
    return NextResponse.json({ error: "ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 404 });
  }

  if (existing.role === "OWNER") {
    return NextResponse.json({ error: "ไม่สามารถลบบัญชีเจ้าของร้าน" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id: params.id } });

  await writeAuditLog({
    userId: user.id,
    action: "DELETE_USER_ACCOUNT",
    entityType: "User",
    entityId: params.id,
    oldValue: {
      username: existing.username,
      role: existing.role,
      permissions: existing.permissions,
      isActive: existing.isActive,
    },
  });

  return NextResponse.json({ success: true });
}
