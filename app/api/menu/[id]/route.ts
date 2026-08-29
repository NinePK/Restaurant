import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { deleteUploadedFile } from "@/lib/upload";
import { z } from "zod";

const menuUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  price: z.number().positive().optional(),
  categoryId: z.string().min(1).optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const item = await prisma.menuItem.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!item) return NextResponse.json({ error: "ไม่พบเมนู" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER", "CASHIER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const existing = await prisma.menuItem.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบเมนู" }, { status: 404 });

  const body = await request.json();
  const parsed = menuUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.menuItem.update({
    where: { id: params.id },
    data: parsed.data,
    include: { category: true, images: true },
  });

  const action = parsed.data.price !== undefined && parsed.data.price !== existing.price
    ? "UPDATE_MENU_PRICE"
    : "UPDATE_MENU_ITEM";

  await writeAuditLog({
    userId: user.id,
    action,
    entityType: "MenuItem",
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

  const existing = await prisma.menuItem.findUnique({
    where: { id: params.id },
    include: { images: true },
  });
  if (!existing) return NextResponse.json({ error: "ไม่พบเมนู" }, { status: 404 });

  await Promise.all(
    existing.images.flatMap((image) => [
      deleteUploadedFile(image.url),
      image.thumbnailUrl && !image.thumbnailUrl.includes("res.cloudinary.com")
        ? deleteUploadedFile(image.thumbnailUrl)
        : Promise.resolve(),
    ])
  );

  // Delete menu item (image records cascade)
  await prisma.menuItem.delete({ where: { id: params.id } });

  await writeAuditLog({
    userId: user.id,
    action: "DELETE_MENU_ITEM",
    entityType: "MenuItem",
    entityId: params.id,
    oldValue: { name: existing.name, price: existing.price },
  });

  return NextResponse.json({ success: true });
}
