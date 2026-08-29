import { NextRequest, NextResponse } from "next/server";
import { Role, WageType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { allPermissions } from "@/lib/permissions";
import { z } from "zod";

const staffSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  wageType: z.nativeEnum(WageType).default("DAILY"),
  wageRate: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  username: z.string().trim().min(3).optional().or(z.literal("")),
  password: z.string().min(6).optional().or(z.literal("")),
  role: z.nativeEnum(Role).optional(),
  permissions: z.array(z.enum(allPermissions as [string, ...string[]])).default([]),
});

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return token ? verifyToken(token) : null;
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const staff = await prisma.staffProfile.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: {
      user: { select: { username: true, role: true, isActive: true } },
      attendance: {
        take: 1,
        orderBy: { date: "desc" },
      },
    },
  });

  return NextResponse.json(staff);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = staffSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const { username, password, role, permissions, ...staffData } = parsed.data;
  if ((username && !password) || (!username && password)) {
    return NextResponse.json({ error: "กรอก username และ password ให้ครบ" }, { status: 400 });
  }

  const staff = await prisma.$transaction(async (tx) => {
    let createdUserId: string | undefined;
    if (username && password) {
      const existingUser = await tx.user.findUnique({ where: { username } });
      if (existingUser) {
        throw new Error("USERNAME_EXISTS");
      }

      const createdUser = await tx.user.create({
        data: {
          username,
          passwordHash: await bcrypt.hash(password, 12),
          role: role || "STAFF",
          permissions,
          isActive: staffData.isActive,
        },
      });
      createdUserId = createdUser.id;
    }

    return tx.staffProfile.create({
      data: {
        ...staffData,
        userId: createdUserId,
      },
      include: {
        user: { select: { username: true, role: true, isActive: true } },
      },
    });
  }).catch((error) => {
    if (error instanceof Error && error.message === "USERNAME_EXISTS") {
      return null;
    }
    throw error;
  });

  if (!staff) {
    return NextResponse.json({ error: "username นี้ถูกใช้แล้ว" }, { status: 409 });
  }

  await writeAuditLog({
    userId: user.id,
    action: "CREATE_STAFF",
    entityType: "StaffProfile",
    entityId: staff.id,
    newValue: { ...staffData, username, role, permissions },
  });

  return NextResponse.json(staff, { status: 201 });
}
