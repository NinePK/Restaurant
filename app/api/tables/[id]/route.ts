import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER", "CASHIER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const updated = await prisma.diningTable.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(request);
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  await prisma.diningTable.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

// POST to /api/tables/[id]/reset-token
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER", "CASHIER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const existing = await prisma.diningTable.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบโต๊ะ" }, { status: 404 });

  const newToken = uuidv4();
  const updated = await prisma.diningTable.update({
    where: { id: params.id },
    data: { qrToken: newToken },
  });

  await writeAuditLog({
    userId: user.id,
    action: "RESET_QR_TOKEN",
    entityType: "DiningTable",
    entityId: params.id,
    oldValue: { qrToken: existing.qrToken },
    newValue: { qrToken: newToken },
  });

  return NextResponse.json(updated);
}
