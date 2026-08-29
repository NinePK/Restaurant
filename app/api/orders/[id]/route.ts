import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

const statusSchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "PREPARING", "SERVED", "CANCELLED"]),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      table: true,
      items: true,
      statusLogs: {
        orderBy: { createdAt: "asc" },
        include: { changedBy: { select: { username: true } } },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
  }

  return NextResponse.json(order);
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER", "CASHIER", "KITCHEN"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const existing = await prisma.order.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
  }

  if (existing.billedAt) {
    return NextResponse.json({ error: "ออเดอร์นี้ถูกปิดบิลแล้ว" }, { status: 400 });
  }

  const body = await request.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
  }

  if (user.role === "KITCHEN" && !["PREPARING", "SERVED"].includes(parsed.data.status)) {
    return NextResponse.json(
      { error: "ครัวเปลี่ยนได้เฉพาะสถานะ กำลังทำ และ เสิร์ฟแล้ว" },
      { status: 403 }
    );
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: { status: parsed.data.status },
    include: { table: true, items: true },
  });

  await prisma.orderStatusLog.create({
    data: {
      orderId: params.id,
      fromStatus: existing.status,
      toStatus: parsed.data.status,
      changedById: user.id,
    },
  });

  if (parsed.data.status === "CANCELLED") {
    await writeAuditLog({
      userId: user.id,
      action: "CANCEL_ORDER",
      entityType: "Order",
      entityId: params.id,
      oldValue: { status: existing.status },
      newValue: { status: parsed.data.status },
    });
  } else {
    await writeAuditLog({
      userId: user.id,
      action: "UPDATE_ORDER_STATUS",
      entityType: "Order",
      entityId: params.id,
      oldValue: { status: existing.status },
      newValue: { status: parsed.data.status },
    });
  }

  return NextResponse.json(updated);
}
