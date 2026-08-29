import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const tableSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อโต๊ะ"),
  isActive: z.boolean().default(true),
});

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function GET() {
  const tables = await prisma.diningTable.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: {
          orders: {
            where: {
              status: { in: ["PENDING", "ACCEPTED", "PREPARING", "SERVED"] },
              billedAt: null,
            },
          },
        },
      },
    },
  });
  return NextResponse.json(tables);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER", "CASHIER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = tableSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const table = await prisma.diningTable.create({
      data: { ...parsed.data, qrToken: uuidv4() },
    });
    return NextResponse.json(table, { status: 201 });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "ชื่อโต๊ะนี้มีอยู่แล้ว" }, { status: 400 });
    }
    throw e;
  }
}
