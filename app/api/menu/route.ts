import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const menuSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อเมนู"),
  description: z.string().optional(),
  price: z.number().positive("ราคาต้องมากกว่า 0"),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");
  const available = searchParams.get("available");
  const featured = searchParams.get("featured");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (categoryId) where.categoryId = categoryId;
  if (available === "true") where.isAvailable = true;
  if (available === "false") where.isAvailable = false;
  if (featured === "true") where.isFeatured = true;
  if (search) where.name = { contains: search, mode: "insensitive" };

  const items = await prisma.menuItem.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      category: { select: { id: true, name: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER", "CASHIER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = menuSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const item = await prisma.menuItem.create({
    data: parsed.data,
    include: { category: true, images: true },
  });

  await writeAuditLog({
    userId: user.id,
    action: "CREATE_MENU_ITEM",
    entityType: "MenuItem",
    entityId: item.id,
    newValue: parsed.data,
  });

  return NextResponse.json(item, { status: 201 });
}
