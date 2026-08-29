import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowRight,
  Clock3,
  CookingPot,
  HandCoins,
  LayoutGrid,
  Receipt,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    todayBills,
    pendingOrders,
    activeTables,
    totalMenuItems,
    recentOrders,
    ordersByStatus,
  ] = await Promise.all([
    prisma.bill.aggregate({
      where: { isPaid: true, paidAt: { gte: today, lt: tomorrow } },
      _sum: { grandTotal: true },
      _count: true,
    }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.diningTable.count({
      where: {
        orders: { some: { status: { in: ["PENDING", "ACCEPTED", "PREPARING"] } } },
      },
    }),
    prisma.menuItem.count({ where: { isAvailable: true } }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        table: { select: { name: true } },
        items: { select: { menuItemName: true, quantity: true } },
      },
    }),
    prisma.order.groupBy({
      by: ["status"],
      _count: true,
      where: { createdAt: { gte: today } },
    }),
  ]);

  return { todayBills, pendingOrders, activeTables, totalMenuItems, recentOrders, ordersByStatus };
}

const statusConfig = {
  PENDING: { label: "รอรับออเดอร์", variant: "warning" as const },
  ACCEPTED: { label: "รับแล้ว", variant: "info" as const },
  PREPARING: { label: "กำลังทำ", variant: "orange" as const },
  SERVED: { label: "เสิร์ฟแล้ว", variant: "success" as const },
  CANCELLED: { label: "ยกเลิก", variant: "destructive" as const },
};

const quickLinks = [
  { href: "/admin/orders", label: "เปิดบอร์ดออเดอร์", icon: CookingPot },
  { href: "/admin/billing", label: "ไปหน้าแคชเชียร์", icon: HandCoins },
  { href: "/admin/menu", label: "จัดการเมนู", icon: UtensilsCrossed },
];

export default async function DashboardPage() {
  const { todayBills, pendingOrders, activeTables, totalMenuItems, recentOrders, ordersByStatus } =
    await getDashboardData();

  const todayRevenue = todayBills._sum.grandTotal || 0;
  const todayBillCount = todayBills._count;
  const preparingCount =
    ordersByStatus.find((item) => item.status === "PREPARING")?._count ?? 0;

  const stats = [
    {
      title: "รายได้วันนี้",
      value: formatCurrency(todayRevenue),
      sub: `${todayBillCount} บิลที่ชำระแล้ว`,
    },
    {
      title: "คิวรอรับ",
      value: pendingOrders.toString(),
      sub: "รอรับออเดอร์",
    },
    {
      title: "โต๊ะกำลังใช้งาน",
      value: activeTables.toString(),
      sub: "มีออเดอร์ค้าง",
    },
    {
      title: "เมนูพร้อมขาย",
      value: totalMenuItems.toString(),
      sub: "พร้อมขาย",
    },
  ];

  return (
    <div className="space-y-6 fade-in">
      <section className="panel-surface panel-hero overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="section-eyebrow">Dashboard</p>
            <h2 className="section-title mt-2">ภาพรวมวันนี้</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className="admin-link-chip">
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.title} className="metric-tile bg-white/80 backdrop-blur">
              <p className="metric-kicker">{stat.title}</p>
              <p className="metric-value">{stat.value}</p>
              <p className="mt-2 text-sm text-muted-foreground">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
        <Card className="panel-surface overflow-hidden">
          <CardHeader className="flex flex-row items-end justify-between gap-4 pb-3">
            <div>
              <p className="section-eyebrow">ล่าสุด</p>
              <CardTitle className="mt-2 text-xl">ออเดอร์ล่าสุด</CardTitle>
            </div>
            <Link href="/admin/orders" className="admin-link-chip">
              ดูทั้งหมด
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.length === 0 ? (
              <div className="panel-muted flex min-h-52 flex-col items-center justify-center p-6 text-center">
                <Sparkles className="h-8 w-8 text-[hsl(var(--admin-accent))]" />
                <p className="mt-3 font-medium text-[hsl(var(--admin-ink))]">ยังไม่มีออเดอร์ใหม่</p>
              </div>
            ) : (
              recentOrders.map((order) => {
                const config = statusConfig[order.status as keyof typeof statusConfig] ?? statusConfig.PENDING;
                return (
                  <div
                    key={order.id}
                    className="panel-muted flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[hsl(var(--admin-ink))] px-3 py-1 text-sm font-semibold text-white">
                          {order.table.name}
                        </span>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[hsl(var(--admin-ink))]">
                        {order.items.map((item) => `${item.menuItemName} × ${item.quantity}`).join(" • ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-sm text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="panel-surface">
            <CardHeader className="pb-3">
              <p className="section-eyebrow">สถานะ</p>
              <CardTitle className="mt-2 text-xl">สถานะออเดอร์วันนี้</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ordersByStatus.length === 0 ? (
                <div className="panel-muted p-4 text-sm text-muted-foreground">
                  ยังไม่มีข้อมูลออเดอร์ในวันนี้
                </div>
              ) : (
                ordersByStatus.map((item) => {
                  const config = statusConfig[item.status as keyof typeof statusConfig];
                  if (!config) return null;

                  return (
                    <div key={item.status} className="panel-muted flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium text-[hsl(var(--admin-ink))]">
                        {config.label}
                      </span>
                      <Badge variant={config.variant} className="min-w-10 justify-center">
                        {item._count}
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="panel-surface">
            <CardHeader className="pb-3">
              <p className="section-eyebrow">คิวสำคัญ</p>
              <CardTitle className="mt-2 text-xl">ต้องดูตอนนี้</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="panel-muted flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--admin-ink))]">กำลังรอรับจากหน้าร้าน</p>
                </div>
                <Badge variant="warning">{pendingOrders}</Badge>
              </div>
              <div className="panel-muted flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--admin-ink))]">กำลังทำในครัว</p>
                </div>
                <Badge variant="orange">{preparingCount}</Badge>
              </div>
              <div className="panel-muted flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--admin-ink))]">โต๊ะที่ยังเปิด</p>
                </div>
                <Badge variant="secondary">{activeTables}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
