import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อร้าน").optional(),
  phone: z.string().optional().nullable(),
  lineId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  themeColor: z.string().optional(),
  serviceChargeEnabled: z.boolean().optional(),
  serviceChargePercent: z.number().min(0).max(100).optional(),
  vatEnabled: z.boolean().optional(),
  vatPercent: z.number().min(0).max(100).optional(),
  receiptFooter: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
});

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function GET() {
  const settings = await prisma.restaurantSetting.findFirst();
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const user = await getUser(request);
  if (!user || user.role !== "OWNER") {
    return NextResponse.json({ error: "เฉพาะเจ้าของร้านเท่านั้น" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.restaurantSetting.findFirst();
  let updated;

  if (existing) {
    updated = await prisma.restaurantSetting.update({
      where: { id: existing.id },
      data: parsed.data,
    });
  } else {
    updated = await prisma.restaurantSetting.create({ data: parsed.data });
  }

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE_SETTINGS",
    entityType: "RestaurantSetting",
    entityId: updated.id,
    oldValue: existing,
    newValue: parsed.data,
  });

  return NextResponse.json(updated);
}
