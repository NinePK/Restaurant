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

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  discountType: z.enum(["flat", "percent"]).optional().nullable(),
  discountValue: optionalNumberField,
  minOrderAmount: optionalNumberField,
  autoApply: z.boolean().optional(),
  canStack: z.boolean().optional(),
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

  const existing = await prisma.promotion.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบโปรโมชัน" }, { status: 404 });

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = {
    ...parsed.data,
    startDate:
      parsed.data.startDate !== undefined
        ? parsed.data.startDate
          ? startOfBangkokDay(parsed.data.startDate)
          : null
        : undefined,
    endDate:
      parsed.data.endDate !== undefined
        ? parsed.data.endDate
          ? endOfBangkokDay(parsed.data.endDate)
          : null
        : undefined,
    discountType:
      parsed.data.discountType !== undefined ? parsed.data.discountType || null : undefined,
    discountValue:
      parsed.data.discountType !== undefined
        ? parsed.data.discountType
          ? parsed.data.discountValue ?? null
          : null
        : parsed.data.discountValue,
    minOrderAmount:
      parsed.data.minOrderAmount !== undefined ? parsed.data.minOrderAmount ?? null : undefined,
  };

  const updated = await prisma.promotion.update({ where: { id: params.id }, data });

  await writeAuditLog({
    userId: user.id,
    action: "UPDATE_PROMOTION",
    entityType: "Promotion",
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

  const existing = await prisma.promotion.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบโปรโมชัน" }, { status: 404 });

  await prisma.promotion.delete({ where: { id: params.id } });

  await writeAuditLog({
    userId: user.id,
    action: "DELETE_PROMOTION",
    entityType: "Promotion",
    entityId: params.id,
    oldValue: existing,
  });

  return NextResponse.json({ success: true });
}
