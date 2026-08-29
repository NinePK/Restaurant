"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BellRing, ClipboardList, Loader2, ShoppingBag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { canAccessPermission } from "@/lib/permissions";
import { formatTime } from "@/lib/utils";

interface User {
  id: string;
  username: string;
  role: string;
  permissions?: string[];
}

interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
}

interface Order {
  id: string;
  createdAt: string;
  table: { id: string; name: string };
  items: OrderItem[];
}

interface OrderNotifierProps {
  user: User;
}

const POLL_INTERVAL_MS = 5000;

export default function OrderNotifier({ user }: OrderNotifierProps) {
  const router = useRouter();
  const pathname = usePathname();
  const canSeeOrders = canAccessPermission(user.role, user.permissions, "orders");
  const seenOrderIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [newOrders, setNewOrders] = useState<Order[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const latestOrder = newOrders[0] ?? pendingOrders[0] ?? null;
  const pendingItemCount = useMemo(
    () => pendingOrders.reduce((sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
    [pendingOrders]
  );

  const loadPendingOrders = useCallback(async () => {
    if (!canSeeOrders) return;

    try {
      setLoading((current) => (initialized.current ? current : true));
      const res = await fetch("/api/orders?status=PENDING", { cache: "no-store" });
      if (!res.ok) return;

      const orders = (await res.json()) as Order[];
      setPendingOrders(orders);

      const currentIds = new Set(orders.map((order) => order.id));
      const unseenOrders = orders.filter((order) => !seenOrderIds.current.has(order.id));

      if (!initialized.current) {
        seenOrderIds.current = currentIds;
        initialized.current = true;
        return;
      }

      if (unseenOrders.length > 0) {
        unseenOrders.forEach((order) => seenOrderIds.current.add(order.id));
        setNewOrders(unseenOrders);
        setPopupOpen(true);
        document.title = `ออเดอร์ใหม่ (${orders.length})`;
      }

      seenOrderIds.current.forEach((id) => {
        if (!currentIds.has(id)) seenOrderIds.current.delete(id);
      });
    } finally {
      setLoading(false);
    }
  }, [canSeeOrders]);

  useEffect(() => {
    if (!canSeeOrders) return;

    loadPendingOrders();
    const interval = window.setInterval(loadPendingOrders, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [canSeeOrders, loadPendingOrders]);

  useEffect(() => {
    if (!popupOpen && pendingOrders.length === 0) {
      document.title = "ระบบจัดการร้านอาหาร";
    }
  }, [pendingOrders.length, popupOpen]);

  if (!canSeeOrders) return null;

  const goToOrders = () => {
    setPopupOpen(false);
    setNewOrders([]);
    router.push("/admin/orders");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (pendingOrders.length > 0) {
            setNewOrders(pendingOrders);
            setPopupOpen(true);
            return;
          }
          router.push("/admin/orders");
        }}
        className="fixed bottom-5 right-5 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-[#17211f] text-white shadow-[0_18px_45px_rgba(23,33,31,0.26)] ring-4 ring-white/80 transition hover:-translate-y-0.5 hover:bg-[#f26a21] hover:shadow-[0_22px_55px_rgba(23,33,31,0.32)] md:bottom-6 md:right-6"
        aria-label="แจ้งเตือนออเดอร์"
        title={pendingOrders.length > 0 ? `${pendingOrders.length} ออเดอร์รอรับ` : "ไม่มีออเดอร์ใหม่"}
      >
        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShoppingBag className="h-6 w-6" />}
        {pendingOrders.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white ring-3 ring-white">
            {pendingOrders.length > 99 ? "99+" : pendingOrders.length}
          </span>
        )}
      </button>

      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="max-w-md overflow-hidden rounded-[1.75rem] border-0 bg-transparent p-0 shadow-none outline-none ring-0 [&>button:last-child]:hidden">
          <div className="overflow-hidden rounded-[1.75rem] bg-[#fffaf2] shadow-[0_26px_80px_rgba(23,33,31,0.28)] ring-1 ring-[#dfd0bd]">
          <button
            type="button"
            onClick={() => setPopupOpen(false)}
            className="absolute right-4 top-4 z-10 rounded-full border border-[#dfd0bd] bg-white p-2 text-[#17211f] transition hover:border-red-200 hover:text-red-600"
            aria-label="ปิดแจ้งเตือน"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="rounded-t-[1.75rem] bg-[#17211f] px-6 py-5 text-white">
            <DialogHeader className="space-y-0 text-left">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f26a21] text-white shadow-lg shadow-orange-950/25">
                <BellRing className="h-7 w-7" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f4c28b]">มีออเดอร์ใหม่</p>
              <DialogTitle className="mt-2 text-2xl font-bold">
                {newOrders.length > 1 ? `เข้ามา ${newOrders.length} ออเดอร์` : "ลูกค้าสั่งอาหารแล้ว"}
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-6 pb-6 pt-5">
            {latestOrder && (
              <div className="rounded-[1.25rem] border border-[#dfd0bd] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#66736c]">โต๊ะ</p>
                    <p className="mt-1 text-2xl font-bold text-[#17211f]">{latestOrder.table.name}</p>
                  </div>
                  <div className="rounded-full bg-[#fff1df] px-3 py-1 text-sm font-semibold text-[#b45309]">
                    {formatTime(latestOrder.createdAt)}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {latestOrder.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl bg-[#fbf7ef] px-3 py-2 text-sm">
                      <span className="font-medium text-[#17211f]">{item.menuItemName}</span>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-[#17211f]">x {item.quantity}</span>
                    </div>
                  ))}
                  {latestOrder.items.length > 3 && (
                    <p className="text-center text-xs text-[#66736c]">มีอีก {latestOrder.items.length - 3} รายการ</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[1rem] bg-[#fbf7ef] p-3">
                <p className="text-xs text-[#66736c]">รอรับคิว</p>
                <p className="mt-1 text-2xl font-bold text-[#17211f]">{pendingOrders.length}</p>
              </div>
              <div className="rounded-[1rem] bg-[#fbf7ef] p-3">
                <p className="text-xs text-[#66736c]">จำนวนรายการ</p>
                <p className="mt-1 text-2xl font-bold text-[#17211f]">{pendingItemCount}</p>
              </div>
            </div>

            <Button onClick={goToOrders} className="h-12 w-full rounded-full bg-[#f26a21] text-white hover:bg-[#d95712]">
              <ClipboardList className="h-4 w-4" />
              ตรวจสอบออเดอร์
            </Button>

            {pathname.startsWith("/admin/orders") && (
              <p className="text-center text-xs text-[#66736c]">คุณอยู่หน้าออเดอร์แล้ว กดปุ่มเพื่อโฟกัสคิวล่าสุด</p>
            )}
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
