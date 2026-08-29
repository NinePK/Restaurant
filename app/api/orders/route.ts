import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { endOfBangkokDay, startOfBangkokDay } from "@/lib/business-time";
import { z } from "zod";

const orderSchema = z.object({
  tableId: z.string().min(1, "กรุณาระบุโต๊ะ"),
  items: z.array(z.object({
    menuItemId: z.string(),
    menuItemName: z.string(),
    price: z.number().positive(),
    quantity: z.number().int().positive(),
    note: z.string().optional(),
  })).min(1, "กรุณาเลือกอาหารอย่างน้อย 1 รายการ"),
  note: z.string().optional(),
});

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const tableId = searchParams.get("tableId");
  const date = searchParams.get("date");
  const unbilledOnly = searchParams.get("unbilledOnly") === "true";

  const where: Record<string, unknown> = {};
  if (status) {
    const statuses = status
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
  }
  if (tableId) where.tableId = tableId;
  if (date) {
    where.createdAt = { gte: startOfBangkokDay(date), lte: endOfBangkokDay(date) };
  }

  if (unbilledOnly && tableId) {
    const latestPaidBill = await prisma.bill.findFirst({
      where: { tableId, isPaid: true },
      orderBy: { paidAt: "desc" },
      select: { paidAt: true },
    });

    where.billedAt = null;

    if (latestPaidBill?.paidAt) {
      where.createdAt = {
        ...(typeof where.createdAt === "object" && where.createdAt !== null ? where.createdAt : {}),
        gt: latestPaidBill.paidAt,
      };
    }
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      table: { select: { id: true, name: true } },
      items: true,
    },
  });

  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "ข้อมูลออเดอร์ไม่ถูกต้อง", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify table exists and is active
    const table = await prisma.diningTable.findUnique({
      where: { id: parsed.data.tableId, isActive: true },
    });
    if (!table) {
      return NextResponse.json({ error: "ไม่พบโต๊ะหรือโต๊ะปิดใช้งาน" }, { status: 404 });
    }

    // Verify menu items are available
    const menuItemIds = parsed.data.items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
      select: { id: true, name: true, price: true },
    });

    const availableIds = new Set(menuItems.map((m) => m.id));
    for (const item of parsed.data.items) {
      if (!availableIds.has(item.menuItemId)) {
        return NextResponse.json(
          { error: `เมนู "${item.menuItemName}" หมดชั่วคราว` },
          { status: 400 }
        );
      }
    }

    const order = await prisma.order.create({
      data: {
        tableId: parsed.data.tableId,
        note: parsed.data.note,
        status: "PENDING",
        billedAt: null,
        items: {
          create: parsed.data.items.map((item) => ({
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            price: item.price,
            quantity: item.quantity,
            note: item.note,
          })),
        },
      },
      include: { table: true, items: true },
    });

    // Log status
    await prisma.orderStatusLog.create({
      data: {
        orderId: order.id,
        fromStatus: null,
        toStatus: "PENDING",
      },
    });

    await writeAuditLog({
      action: "CREATE_ORDER",
      entityType: "Order",
      entityId: order.id,
      newValue: { tableId: parsed.data.tableId, itemCount: parsed.data.items.length },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Order creation error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการสั่งอาหาร" }, { status: 500 });
  }
}
