"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDateTime, formatTime } from "@/lib/utils";
import {
  AlertCircle,
  ArrowRight,
  ChevronDown,
  Clock3,
  CookingPot,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  price: number;
  note: string | null;
}

interface Order {
  id: string;
  status: string;
  note: string | null;
  createdAt: string;
  table: { id: string; name: string };
  items: OrderItem[];
}

const STATUS_FLOW: Record<string, { next: string; label: string; tone: string }> = {
  PENDING: { next: "ACCEPTED", label: "รับคิว", tone: "bg-[#1d5fa8] hover:bg-[#174d87]" },
  ACCEPTED: { next: "PREPARING", label: "ส่งครัว", tone: "bg-[#b96526] hover:bg-[#9d5520]" },
  PREPARING: { next: "SERVED", label: "เสิร์ฟแล้ว", tone: "bg-[#3d7d58] hover:bg-[#33694b]" },
};

const statusConfig = {
  PENDING: {
    label: "รอรับออเดอร์",
    helper: "รอรับ",
    icon: AlertCircle,
    badge: "warning" as const,
  },
  ACCEPTED: {
    label: "รับแล้ว",
    helper: "รับแล้ว",
    icon: Clock3,
    badge: "info" as const,
  },
  PREPARING: {
    label: "กำลังทำ",
    helper: "กำลังทำ",
    icon: CookingPot,
    badge: "orange" as const,
  },
};

const orderStatuses = ["PENDING", "ACCEPTED", "PREPARING"] as const;
const VISIBLE_ORDERS_PER_COLUMN = 10;
const VISIBLE_ITEMS_PER_ORDER = 3;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({});
  const [expandedOrderItems, setExpandedOrderItems] = useState<Record<string, boolean>>({});

  const fetchOrders = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);

    try {
      const res = await fetch("/api/orders?status=PENDING,ACCEPTED,PREPARING");
      const data = await res.json();
      setOrders(data);
    } catch {
      toast.error("โหลดรายการออเดอร์ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders(true);
    const interval = setInterval(() => fetchOrders(false), 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const groupedOrders = useMemo(
    () => ({
      PENDING: orders.filter((order) => order.status === "PENDING"),
      ACCEPTED: orders.filter((order) => order.status === "ACCEPTED"),
      PREPARING: orders.filter((order) => order.status === "PREPARING"),
    }),
    [orders]
  );

  const statusSummaries = useMemo(
    () =>
      orderStatuses.map((status) => {
        const statusOrders = groupedOrders[status];
        const totalItems = statusOrders.reduce(
          (sum, order) =>
            sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
          0
        );

        return {
          status,
          config: statusConfig[status],
          orders: statusOrders,
          totalItems,
        };
      }),
    [groupedOrders]
  );

  const updateStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "อัปเดตสถานะไม่สำเร็จ");
        return;
      }

      toast.success("อัปเดตสถานะแล้ว");
      fetchOrders(false);
    } catch {
      toast.error("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    } finally {
      setUpdatingId(null);
    }
  };

  const cancelOrder = async () => {
    if (!selectedOrder) return;
    await updateStatus(selectedOrder.id, "CANCELLED");
    setCancelDialogOpen(false);
    setSelectedOrder(null);
  };

  return (
    <div className="space-y-6 fade-in">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
        {statusSummaries.map(({ status, config, orders, totalItems }) => {
          const Icon = config.icon;

          return (
            <div key={status} className="metric-tile bg-white/85 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="metric-kicker">{config.label}</p>
                  <p className="metric-value">{orders.length}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--admin-accent-soft))] text-[hsl(var(--admin-accent))]">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{totalItems} รายการ</p>
            </div>
          );
        })}

        <div className="flex md:items-stretch">
          <Button
            variant="outline"
            onClick={() => fetchOrders(true)}
            className="h-full min-h-20 w-full rounded-[1.4rem] border-[hsl(var(--admin-line))] bg-white px-5"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            รีเฟรช
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {statusSummaries.map(({ status, config, orders, totalItems }) => {
          const Icon = config.icon;
          const isExpanded = expandedColumns[status];
          const visibleOrders = isExpanded ? orders : orders.slice(0, VISIBLE_ORDERS_PER_COLUMN);
          const hiddenCount = Math.max(orders.length - VISIBLE_ORDERS_PER_COLUMN, 0);

          return (
            <div key={status} className="queue-column">
              <div className="flex items-center justify-between rounded-[1rem] bg-[rgba(255,255,255,0.72)] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[hsl(var(--admin-accent-soft))] text-[hsl(var(--admin-accent))]">
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--admin-ink))]">{config.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {orders.length} ออเดอร์ · {totalItems} รายการ
                    </p>
                  </div>
                </div>
                <Badge variant={config.badge} className="px-3 py-1">
                  {orders.length}
                </Badge>
              </div>

              <div className="queue-column-body">
                {orders.length === 0 ? (
                  <div className="panel-muted flex min-h-40 items-center justify-center p-5 text-center text-sm text-muted-foreground">
                    ยังไม่มีออเดอร์ในคอลัมน์นี้
                  </div>
                ) : (
                  <>
                  {visibleOrders.map((order) => {
                    const flow = STATUS_FLOW[order.status];
                    const showAllItems = expandedOrderItems[order.id];
                    const visibleItems = showAllItems
                      ? order.items
                      : order.items.slice(0, VISIBLE_ITEMS_PER_ORDER);
                    const hiddenItemCount = Math.max(order.items.length - VISIBLE_ITEMS_PER_ORDER, 0);

                    return (
                      <article key={order.id} className="ticket-card">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-[hsl(var(--admin-ink))] px-3 py-1 text-sm font-semibold text-white">
                                {order.table.name}
                              </span>
                              <Badge variant={config.badge}>{order.items.length} รายการ</Badge>
                            </div>
                            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              รับคิวเมื่อ {formatTime(order.createdAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(order.createdAt)}
                            </span>
                            <div className="flex gap-2">
                              {flow && (
                                <Button
                                  size="sm"
                                  className={`h-9 rounded-full px-3 text-white ${flow.tone}`}
                                  onClick={() => updateStatus(order.id, flow.next)}
                                  disabled={updatingId === order.id}
                                >
                                  {updatingId === order.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <ArrowRight className="h-4 w-4" />
                                  )}
                                  {flow.label}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 rounded-full border-red-200 bg-white px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setCancelDialogOpen(true);
                                }}
                                disabled={updatingId === order.id}
                                aria-label="ยกเลิกออเดอร์"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {visibleItems.map((item) => (
                            <div key={item.id} className="panel-muted px-3 py-2.5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[hsl(var(--admin-ink))]">
                                    {item.menuItemName}
                                  </p>
                                  {item.note && (
                                    <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
                                  )}
                                </div>
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[hsl(var(--admin-ink))]">
                                  × {item.quantity}
                                </span>
                              </div>
                            </div>
                          ))}
                          {hiddenItemCount > 0 && (
                            <button
                              type="button"
                              className="w-full rounded-2xl border border-dashed border-[hsl(var(--admin-line))] bg-white px-3 py-2 text-sm font-medium text-[hsl(var(--admin-ink))] transition hover:border-[hsl(var(--admin-accent))] hover:text-[hsl(var(--admin-accent))]"
                              onClick={() =>
                                setExpandedOrderItems((current) => ({
                                  ...current,
                                  [order.id]: !showAllItems,
                                }))
                              }
                            >
                              {showAllItems ? "ย่อรายการ" : `ดูครบอีก ${hiddenItemCount} รายการ`}
                            </button>
                          )}
                        </div>

                        {order.note && (
                          <div className="mt-4 rounded-2xl border border-dashed border-[hsl(var(--admin-line))] bg-[rgba(255,248,238,0.9)] px-3 py-2.5 text-sm text-[hsl(var(--admin-ink))]">
                            <span className="font-medium">หมายเหตุ:</span> {order.note}
                          </div>
                        )}

                        <div className="hidden">
                          {flow && (
                            <Button
                              size="sm"
                              className={`h-10 flex-1 rounded-full text-white ${flow.tone}`}
                              onClick={() => updateStatus(order.id, flow.next)}
                              disabled={updatingId === order.id}
                            >
                              {updatingId === order.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ArrowRight className="h-4 w-4" />
                              )}
                              {flow.label}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-10 rounded-full border-red-200 bg-white px-4 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                              setSelectedOrder(order);
                              setCancelDialogOpen(true);
                            }}
                            disabled={updatingId === order.id}
                          >
                            <XCircle className="h-4 w-4" />
                            ยกเลิก
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                  {hiddenCount > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 w-full rounded-full bg-white"
                      onClick={() =>
                        setExpandedColumns((current) => ({
                          ...current,
                          [status]: !isExpanded,
                        }))
                      }
                    >
                      <ChevronDown className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`} />
                      {isExpanded ? "ย่อรายการ" : `ดูเพิ่มอีก ${hiddenCount} ออเดอร์`}
                    </Button>
                  )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="rounded-[1.5rem]">
          <DialogHeader>
            <DialogTitle>ยืนยันการยกเลิกออเดอร์</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ต้องการยกเลิกออเดอร์ของ <strong>{selectedOrder?.table.name}</strong> ใช่หรือไม่
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              กลับไปก่อน
            </Button>
            <Button variant="destructive" onClick={cancelOrder}>
              ยืนยันการยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
