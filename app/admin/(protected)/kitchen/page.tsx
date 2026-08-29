"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { ChefHat, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/utils";

interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  note: string | null;
}

interface Order {
  id: string;
  status: string;
  createdAt: string;
  table: { id: string; name: string };
  items: OrderItem[];
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?status=ACCEPTED,PREPARING");
      const data = await res.json();
      setOrders(data);
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, status: "PREPARING" | "SERVED") => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(status === "PREPARING" ? "เริ่มทำแล้ว" : "เสิร์ฟแล้ว!");
        fetchOrders();
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const preparing = orders.filter((o) => o.status === "PREPARING");
  const accepted = orders.filter((o) => o.status === "ACCEPTED");

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">หน้าจอครัว</h1>
            <p className="text-gray-400 text-xs">อัปเดตทุก 5 วินาที</p>
          </div>
        </div>
        <button
          onClick={fetchOrders}
          className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <CheckCircle2 className="w-16 h-16 mb-4 text-green-700/50" />
          <p className="text-xl font-medium">ไม่มีออเดอร์ที่ต้องทำ</p>
          <p className="text-sm mt-1">ทุกอย่างเสร็จแล้ว 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Accepted (new) orders */}
          {accepted.map((order) => (
            <div
              key={order.id}
              className="bg-yellow-900/40 border border-yellow-600/50 rounded-2xl p-4 new-order-pulse"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xl font-bold text-yellow-300">{order.table.name}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs text-yellow-400">{formatTime(order.createdAt)}</span>
                    <Badge className="bg-yellow-600 text-yellow-100 text-xs">ใหม่!</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {order.items.map((item) => (
                  <div key={item.id} className="bg-yellow-900/30 rounded-lg px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-yellow-200 font-bold text-lg w-8">{item.quantity}×</span>
                      <span className="text-white font-medium">{item.menuItemName}</span>
                    </div>
                    {item.note && (
                      <p className="text-yellow-300/80 text-xs ml-10 mt-0.5">📝 {item.note}</p>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => updateStatus(order.id, "PREPARING")}
                disabled={updatingId === order.id}
                className="w-full py-3 bg-orange-500 hover:bg-orange-400 rounded-xl font-bold text-white transition-colors disabled:opacity-50"
              >
                🔥 เริ่มทำ
              </button>
            </div>
          ))}

          {/* Preparing orders */}
          {preparing.map((order) => (
            <div
              key={order.id}
              className="bg-orange-900/40 border border-orange-600/50 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xl font-bold text-orange-300">{order.table.name}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3 h-3 text-orange-400" />
                    <span className="text-xs text-orange-400">{formatTime(order.createdAt)}</span>
                    <Badge className="bg-orange-700 text-orange-100 text-xs">กำลังทำ</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {order.items.map((item) => (
                  <div key={item.id} className="bg-orange-900/30 rounded-lg px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-orange-200 font-bold text-lg w-8">{item.quantity}×</span>
                      <span className="text-white font-medium">{item.menuItemName}</span>
                    </div>
                    {item.note && (
                      <p className="text-orange-300/80 text-xs ml-10 mt-0.5">📝 {item.note}</p>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => updateStatus(order.id, "SERVED")}
                disabled={updatingId === order.id}
                className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-white transition-colors disabled:opacity-50"
              >
                ✅ เสิร์ฟแล้ว
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
