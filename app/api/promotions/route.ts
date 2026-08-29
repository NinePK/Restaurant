import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { endOfBangkokDay, startOfBangkokDay } from "@/lib/business-time";
import { z } from "zod";

const optionalNumberField = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().min(0).optional()
);

const promotionSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อโปรโมชัน"),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  discountType: z.enum(["flat", "percent"]).optional().nullable(),
  discountValue: optionalNumberField,
  minOrderAmount: optionalNumberField,
  autoApply: z.boolean().default(false),
  canStack: z.boolean().default(false),
});

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function GET() {
  const promotions = await prisma.promotion.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(promotions);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER", "CASHIER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = promotionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    startDate: parsed.data.startDate ? startOfBangkokDay(parsed.data.startDate) : null,
    endDate: parsed.data.endDate ? endOfBangkokDay(parsed.data.endDate) : null,
    discountType: parsed.data.discountType || null,
    discountValue: parsed.data.discountType ? parsed.data.discountValue ?? null : null,
    minOrderAmount: parsed.data.minOrderAmount ?? null,
  };

  const promo = await prisma.promotion.create({ data });

  await writeAuditLog({
    userId: user.id,
    action: "CREATE_PROMOTION",
    entityType: "Promotion",
    entityId: promo.id,
    newValue: parsed.data,
  });

  return NextResponse.json(promo, { status: 201 });
}
