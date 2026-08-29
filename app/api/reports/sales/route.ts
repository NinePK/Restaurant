import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { endOfBangkokDay, startOfBangkokDay } from "@/lib/business-time";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: Prisma.BillWhereInput = { isPaid: true };
  if (startDate || endDate) {
    where.createdAt = {
      ...(startDate ? { gte: startOfBangkokDay(startDate) } : {}),
      ...(endDate ? { lte: endOfBangkokDay(endDate) } : {}),
    };
  }

  const bills = await prisma.bill.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      table: { select: { name: true } },
    },
  });

  const paymentSummary = new Map<string, { amount: number; count: number }>();
  const itemSummary = new Map<string, { quantity: number; amount: number }>();
  const dailySummary = new Map<string, { amount: number; count: number }>();

  for (const bill of bills) {
    const payment = paymentSummary.get(bill.paymentMethod) || { amount: 0, count: 0 };
    payment.amount += bill.grandTotal;
    payment.count += 1;
    paymentSummary.set(bill.paymentMethod, payment);

    const dateKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(bill.paidAt || bill.createdAt);
    const day = dailySummary.get(dateKey) || { amount: 0, count: 0 };
    day.amount += bill.grandTotal;
    day.count += 1;
    dailySummary.set(dateKey, day);

    for (const item of bill.items) {
      const current = itemSummary.get(item.menuItemName) || { quantity: 0, amount: 0 };
      current.quantity += item.quantity;
      current.amount += item.totalPrice;
      itemSummary.set(item.menuItemName, current);
    }
  }

  const totalRevenue = bills.reduce((sum, bill) => sum + bill.grandTotal, 0);
  const totalDiscount = bills.reduce((sum, bill) => sum + bill.discount, 0);
  const totalVat = bills.reduce((sum, bill) => sum + bill.vat, 0);
  const totalServiceCharge = bills.reduce((sum, bill) => sum + bill.serviceCharge, 0);

  return NextResponse.json({
    summary: {
      totalRevenue,
      billCount: bills.length,
      totalDiscount,
      totalVat,
      totalServiceCharge,
    },
    payments: Array.from(paymentSummary.entries()).map(([method, value]) => ({
      method,
      ...value,
    })),
    topItems: Array.from(itemSummary.entries())
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10),
    daily: Array.from(dailySummary.entries())
      .map(([date, value]) => ({ date, ...value }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    recentBills: bills.slice(0, 8).map((bill) => ({
      id: bill.id,
      billNumber: bill.billNumber,
      tableName: bill.table.name,
      grandTotal: bill.grandTotal,
      paymentMethod: bill.paymentMethod,
      paidAt: bill.paidAt,
      createdAt: bill.createdAt,
    })),
  });
}
