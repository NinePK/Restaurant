"use client";

import { useEffect, useMemo, useState } from "react";
import { Menu, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import OrderNotifier from "@/components/admin/OrderNotifier";
import { getRoleLabel } from "@/lib/utils";

interface User {
  id: string;
  username: string;
  role: string;
  permissions?: string[];
}

interface AdminShellProps {
  children: React.ReactNode;
  user: User;
}

const pageMeta = [
  { match: "/admin/dashboard", title: "ภาพรวมร้าน", subtitle: "ตัวเลขสำคัญและคิวที่ต้องตัดสินใจทันที" },
  { match: "/admin/orders", title: "บอร์ดออเดอร์", subtitle: "เรียงคิวแบบเห็นภาพและกดทำงานต่อได้ทันที" },
  { match: "/admin/kitchen", title: "สถานีครัว", subtitle: "คิวที่ครัวต้องทำต่อในจังหวะที่เร็วที่สุด" },
  { match: "/admin/billing", title: "แคชเชียร์", subtitle: "เลือกโต๊ะ สรุปยอด และปิดบิลให้ไวที่สุด" },
  { match: "/admin/menu", title: "เมนูอาหาร", subtitle: "จัดการรายการขายให้ทีมหน้าร้านหยิบใช้ง่าย" },
  { match: "/admin/categories", title: "หมวดหมู่", subtitle: "จัดกลุ่มเมนูให้ลูกค้าค้นและสั่งได้เร็ว" },
  { match: "/admin/promotions", title: "โปรโมชัน", subtitle: "ดูแลข้อเสนอขายโดยไม่ให้หน้าเมนูรก" },
  { match: "/admin/tables", title: "โต๊ะและ QR", subtitle: "จุดเริ่มต้นของประสบการณ์ลูกค้าหน้าร้าน" },
  { match: "/admin/settings", title: "ตั้งค่าร้าน", subtitle: "รายละเอียดร้าน ภาษี และภาพลักษณ์การให้บริการ" },
];

export default function AdminShell({ children, user }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState(() =>
    new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date())
  );
  const pathname = usePathname();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(
        new Intl.DateTimeFormat("th-TH", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date())
      );
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const meta = useMemo(() => {
    return pageMeta.find((item) => pathname.startsWith(item.match)) ?? pageMeta[0];
  }, [pathname]);

  const syncLabel =
    pathname.startsWith("/admin/orders") || pathname.startsWith("/admin/kitchen")
      ? "อัปเดตอัตโนมัติทุก 5 วินาที"
      : "พร้อมใช้งาน";

  return (
    <div className="admin-shell-bg flex min-h-screen overflow-hidden">
      <AdminSidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <OrderNotifier user={user} />

      <div className="flex-1 min-w-0">
        <div className="mx-auto flex min-h-screen w-full max-w-[1700px] flex-col px-3 pb-4 pt-3 md:px-4 lg:px-5">
          <header className="sticky top-0 z-20 pb-4 backdrop-blur-sm">
            <div className="panel-surface flex flex-col gap-4 px-4 py-4 md:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[hsl(var(--admin-line))] bg-white text-[hsl(var(--admin-ink))] lg:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                  <div>
                    <p className="section-eyebrow">Restaurant Control Room</p>
                    <h1 className="section-title mt-1">{meta.title}</h1>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                      {meta.subtitle}
                    </p>
                  </div>
                </div>

                <div className="hidden items-center gap-2 md:flex">
                  <div className="topbar-pill">
                    <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--admin-accent))]" />
                    {syncLabel}
                  </div>
                  <div className="topbar-pill">{now}</div>
                  <div className="topbar-pill">{getRoleLabel(user.role)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 md:hidden">
                <div className="topbar-pill">{getRoleLabel(user.role)}</div>
                <div className="topbar-pill">{syncLabel}</div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="mx-auto w-full max-w-[1600px] pb-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
