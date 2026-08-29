import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CustomerMenuClient from "./CustomerMenuClient";

interface Props {
  params: { qrToken: string };
}

async function getTableData(qrToken: string) {
  const table = await prisma.diningTable.findUnique({
    where: { qrToken, isActive: true },
  });
  if (!table) return null;

  const [settings, categories, menuItems, promotions] = await Promise.all([
    prisma.restaurantSetting.findFirst(),
    prisma.category.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.menuItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        category: { select: { id: true, name: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 3 },
      },
    }),
    prisma.promotion.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: new Date() } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: new Date() } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { table, settings, categories, menuItems, promotions };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getTableData(params.qrToken);
  if (!data) return { title: "ไม่พบโต๊ะ" };

  return {
    title: `${data.table.name} — ${data.settings?.name || "เมนูอาหาร"}`,
    description: `สั่งอาหารออนไลน์ที่ ${data.table.name}`,
    viewport: "width=device-width, initial-scale=1, maximum-scale=1",
  };
}

export default async function CustomerMenuPage({ params }: Props) {
  const data = await getTableData(params.qrToken);

  if (!data) {
    notFound();
  }

  return (
    <CustomerMenuClient
      table={data.table}
      settings={data.settings}
      categories={data.categories}
      menuItems={data.menuItems}
      promotions={data.promotions}
    />
  );
}
