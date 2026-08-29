import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อหมวดหมู่").optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER", "CASHIER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const existing = await prisma.category.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบหมวดหมู่" }, { status: 404 });

  const body = await request.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.category.update({
    where: { id: params.id },
    data: parsed.data,
  });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE_CATEGORY",
    entityType: "Category",
    entityId: params.id,
    oldValue: existing,
    newValue: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER", "CASHIER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const existing = await prisma.category.findUnique({
    where: { id: params.id },
    include: { _count: { select: { menuItems: true } } },
  });
  if (!existing) return NextResponse.json({ error: "ไม่พบหมวดหมู่" }, { status: 404 });

  if (existing._count.menuItems > 0) {
    return NextResponse.json(
      { error: `ไม่สามารถลบได้ เนื่องจากมีเมนูอาหาร ${existing._count.menuItems} รายการในหมวดหมู่นี้` },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id: params.id } });

  await writeAuditLog({
    userId: user.id,
    action: "DELETE_CATEGORY",
    entityType: "Category",
    entityId: params.id,
    oldValue: existing,
  });

  return NextResponse.json({ success: true });
}
