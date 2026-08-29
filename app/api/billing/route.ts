import { NextRequest, NextResponse } from "next/server";
import { PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import {
  calculateManualDiscountAmount,
  getPromotionEligibilityReason,
  resolveAppliedPromotions,
} from "@/lib/promotion-utils";
import { endOfBangkokDay, formatBangkokDateInput, startOfBangkokDay } from "@/lib/business-time";
import { z } from "zod";

async function getUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

const billSchema = z.object({
  tableId: z.string().min(1),
  orderIds: z.array(z.string()).min(1),
  manualDiscountValue: z.number().min(0).default(0),
  manualDiscountType: z.enum(["flat", "percent"]).optional(),
  promotionIds: z.array(z.string()).default([]),
  paymentMethod: z.enum(["CASH", "BANK_TRANSFER", "PROMPTPAY", "CARD"]),
  note: z.string().optional(),
});

const paymentMethods: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "PROMPTPAY", "CARD"];

function getThaiBillPrefix(date = new Date()) {
  const [year, month, day] = formatBangkokDateInput(date).split("-");
  return `บิล-${day}${month}${year.slice(-2)}`;
}

async function generateNextBillNumber(tx: Prisma.TransactionClient) {
  const prefix = getThaiBillPrefix();
  const latestBill = await tx.bill.findFirst({
    where: { billNumber: { startsWith: `${prefix}-` } },
    orderBy: { billNumber: "desc" },
    select: { billNumber: true },
  });

  const latestSequence = Number(latestBill?.billNumber.split("-").at(-1) || 0);
  const nextSequence = Number.isFinite(latestSequence) ? latestSequence + 1 : 1;
  return `${prefix}-${String(nextSequence).padStart(3, "0")}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tableId = searchParams.get("tableId");
  const isPaid = searchParams.get("isPaid");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const paymentMethod = searchParams.get("paymentMethod");
  const q = searchParams.get("q")?.trim();
  const limit = Math.min(Number(searchParams.get("limit") || 100), 300);

  const where: Prisma.BillWhereInput = {};
  if (tableId) where.tableId = tableId;
  if (isPaid !== null) where.isPaid = isPaid === "true";
  if (paymentMethod && paymentMethod !== "ALL" && paymentMethods.includes(paymentMethod as PaymentMethod)) {
    where.paymentMethod = paymentMethod as PaymentMethod;
  }
  if (startDate || endDate) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (startDate) createdAt.gte = startOfBangkokDay(startDate);
    if (endDate) {
      createdAt.lte = endOfBangkokDay(endDate);
    }
    where.createdAt = createdAt;
  }
  if (q) {
    where.OR = [
      { billNumber: { contains: q, mode: "insensitive" } },
      { note: { contains: q, mode: "insensitive" } },
      { table: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const bills = await prisma.bill.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      table: { select: { name: true } },
      items: true,
      payments: true,
      createdBy: { select: { username: true } },
    },
  });

  return NextResponse.json(bills);
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user || !["OWNER", "MANAGER", "CASHIER"].includes(user.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = billSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten() }, { status: 400 });
  }

  const {
    tableId,
    orderIds,
    manualDiscountValue,
    manualDiscountType,
    promotionIds,
    paymentMethod,
    note,
  } = parsed.data;

  const latestPaidBill = await prisma.bill.findFirst({
    where: { tableId, isPaid: true },
    orderBy: { paidAt: "desc" },
    select: { paidAt: true },
  });

  // Get all orders and their items
  const orders = await prisma.order.findMany({
    where: {
      id: { in: orderIds },
      tableId,
      billedAt: null,
      ...(latestPaidBill?.paidAt
        ? {
            createdAt: {
              gt: latestPaidBill.paidAt,
            },
          }
        : {}),
    },
    include: { items: true },
  });

  if (orders.length === 0) {
    return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
  }

  // Get restaurant settings for VAT and service charge
  const settings = await prisma.restaurantSetting.findFirst();

  // Calculate totals
  let subtotal = 0;
  const billItems: { menuItemName: string; quantity: number; unitPrice: number; totalPrice: number }[] = [];

  for (const order of orders) {
    for (const item of order.items) {
      const totalPrice = item.price * item.quantity;
      subtotal += totalPrice;
      billItems.push({
        menuItemName: item.menuItemName,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice,
      });
    }
  }

  const promotions = await prisma.promotion.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const invalidPromotion = promotions.find(
    (promotion) =>
      promotionIds.includes(promotion.id) &&
      getPromotionEligibilityReason(promotion, subtotal) !== null
  );

  if (invalidPromotion) {
    return NextResponse.json(
      { error: `โปรโมชัน "${invalidPromotion.name}" ยังไม่เข้าเงื่อนไขการใช้งาน` },
      { status: 400 }
    );
  }

  const selectedEligiblePromotions = promotions.filter((promotion) =>
    promotionIds.includes(promotion.id)
  );

  if (
    selectedEligiblePromotions.length > 1 &&
    selectedEligiblePromotions.some((promotion) => !promotion.canStack)
  ) {
    return NextResponse.json(
      { error: "มีโปรโมชันที่ไม่สามารถใช้ร่วมกับโปรอื่นได้" },
      { status: 400 }
    );
  }

  const resolvedPromotions = resolveAppliedPromotions(promotions, promotionIds, subtotal);
  const appliedPromotions = resolvedPromotions.appliedPromotions;
  const promotionDiscountAmount = appliedPromotions.reduce(
    (sum, promotion) => sum + promotion.discountAmount,
    0
  );
  const manualDiscountAmount = calculateManualDiscountAmount(
    subtotal,
    manualDiscountValue,
    manualDiscountType || "flat"
  );
  const discountAmount = Math.min(subtotal, manualDiscountAmount + promotionDiscountAmount);
  const afterDiscount = Math.max(0, subtotal - discountAmount);

  // Service charge
  let serviceCharge = 0;
  if (settings?.serviceChargeEnabled) {
    serviceCharge = afterDiscount * ((settings.serviceChargePercent || 10) / 100);
  }

  const afterServiceCharge = afterDiscount + serviceCharge;

  // VAT
  let vat = 0;
  if (settings?.vatEnabled) {
    vat = afterServiceCharge * ((settings.vatPercent || 7) / 100);
  }

  const grandTotal = afterServiceCharge + vat;

  // Create bill in transaction
  const bill = await prisma.$transaction(async (tx) => {
    const billNumber = await generateNextBillNumber(tx);

    const newBill = await tx.bill.create({
      data: {
        billNumber,
        tableId,
        subtotal,
        discount: discountAmount,
        discountType:
          appliedPromotions.length > 0 && manualDiscountAmount > 0
            ? "combined"
            : appliedPromotions.length > 0
              ? "promotion"
              : manualDiscountType || "flat",
        promotionIds: appliedPromotions.map((promotion) => promotion.id),
        promotionSummary: appliedPromotions.map((promotion) => ({
          id: promotion.id,
          name: promotion.name,
          discountType: promotion.discountType,
          discountValue: promotion.discountValue,
          minOrderAmount: promotion.minOrderAmount,
          autoApply: promotion.autoApply,
          canStack: promotion.canStack,
          discountAmount: promotion.discountAmount,
        })),
        serviceCharge,
        vat,
        grandTotal,
        paymentMethod,
        isPaid: true,
        paidAt: new Date(),
        createdById: user.id,
        note,
        receiptFooter: settings?.receiptFooter || undefined,
        items: { create: billItems },
        payments: {
          create: {
            amount: grandTotal,
            method: paymentMethod,
          },
        },
      },
      include: {
        items: true,
        payments: true,
        table: true,
        createdBy: { select: { username: true } },
      },
    });

    // Mark orders as served
    await tx.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status: "SERVED", billedAt: new Date() },
    });

    return newBill;
  });

  await writeAuditLog({
    userId: user.id,
    action: "CREATE_BILL",
    entityType: "Bill",
    entityId: bill.id,
    newValue: {
      billNumber: bill.billNumber,
      tableId,
      grandTotal,
      paymentMethod,
      promotions: appliedPromotions.map((promotion) => promotion.name),
    },
  });

  if (discountAmount > 0) {
    await writeAuditLog({
      userId: user.id,
      action: "CREATE_DISCOUNT",
      entityType: "Bill",
      entityId: bill.id,
      newValue: {
        discount: discountAmount,
        manualDiscountValue,
        manualDiscountType,
        promotionDiscountAmount,
        promotions: appliedPromotions.map((promotion) => ({
          id: promotion.id,
          name: promotion.name,
          discountAmount: promotion.discountAmount,
        })),
      },
    });
  }

  return NextResponse.json(bill, { status: 201 });
}
