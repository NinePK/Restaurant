"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn, getRoleLabel } from "@/lib/utils";
import { canAccessPermission } from "@/lib/permissions";
import {
  BookOpenText,
  Calculator,
  ChefHat,
  ClipboardList,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  QrCode,
  Receipt,
  Settings,
  ShieldCheck,
  Tag,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  roles: string[];
  permission: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "งานหน้าร้าน",
    items: [
      { href: "/admin/dashboard", icon: LayoutDashboard, label: "แดชบอร์ด", permission: "dashboard", roles: [] },
      { href: "/admin/orders", icon: ClipboardList, label: "ออเดอร์", permission: "orders", roles: [] },
      { href: "/admin/kitchen", icon: ChefHat, label: "หน้าจอครัว", permission: "kitchen", roles: [] },
      { href: "/admin/billing", icon: Receipt, label: "ออกบิล", permission: "billing", roles: [] },
      { href: "/admin/bills", icon: FileText, label: "ประวัติบิล", permission: "bills", roles: [] },
    ],
  },
  {
    title: "เมนูและพื้นที่ขาย",
    items: [
      { href: "/admin/menu", icon: UtensilsCrossed, label: "เมนูอาหาร", permission: "menu", roles: [] },
      { href: "/admin/categories", icon: Tag, label: "หมวดหมู่", permission: "categories", roles: [] },
      { href: "/admin/promotions", icon: Megaphone, label: "โปรโมชั่น", permission: "promotions", roles: [] },
      { href: "/admin/tables", icon: QrCode, label: "โต๊ะและ QR", permission: "tables", roles: [] },
    ],
  },
  {
    title: "ทีมงาน",
    items: [
      { href: "/admin/staff", icon: Users, label: "พนักงาน", permission: "staff", roles: [] },
      { href: "/admin/attendance", icon: Clock3, label: "เวลาเข้างาน", permission: "attendance", roles: [] },
      { href: "/admin/payroll", icon: Calculator, label: "เงินเดือน", permission: "payroll", roles: [] },
    ],
  },
  {
    title: "การควบคุม",
    items: [
      { href: "/admin/reports", icon: BookOpenText, label: "รายงาน", permission: "reports", roles: [] },
      { href: "/admin/settings", icon: Settings, label: "ตั้งค่าร้าน", permission: "settings", roles: [] },
      { href: "/admin/audit-logs", icon: ShieldCheck, label: "ประวัติการใช้งาน", permission: "audit-logs", roles: [] },
    ],
  },
];

interface User {
  id: string;
  username: string;
  role: string;
  permissions?: string[];
}

interface AdminSidebarProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ user, isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<{ name?: string; logoUrl?: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setRestaurant(data))
      .catch(() => setRestaurant(null));
  }, []);

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessPermission(user.role, user.permissions, item.permission)),
    }))
    .filter((section) => section.items.length > 0);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      toast.success("ออกจากระบบแล้ว");
      router.push("/admin/login");
    } catch {
      toast.error("ออกจากระบบไม่สำเร็จ");
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-[rgba(11,16,15,0.55)] backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-[19rem] flex-col border-r border-white/10 bg-[#15201e] text-stone-100 shadow-2xl transition-transform duration-300",
          "lg:relative lg:translate-x-0 lg:rounded-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="border-b border-white/10 px-5 pb-5 pt-6">
          <div className="flex items-start justify-between gap-3">
            <Link href="/admin/dashboard" className="group flex items-center gap-3" onClick={onClose}>
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[#f5a45b] text-[#1c1914] shadow-lg shadow-orange-950/20 transition-transform group-hover:scale-[1.03]">
                {restaurant?.logoUrl ? (
                  <Image src={restaurant.logoUrl} alt="restaurant logo" fill sizes="48px" className="object-cover" />
                ) : (
                  <ChefHat className="h-6 w-6" />
                )}
                <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#15201e] bg-emerald-400" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-400">
                  Service Board
                </p>
                <p className="mt-1 max-w-[10rem] truncate text-base font-semibold text-stone-100">
                  {restaurant?.name || "Restaurant Ops"}
                </p>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="rounded-2xl border border-white/10 p-2 text-stone-400 transition hover:border-white/20 hover:text-white lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold uppercase text-[#f4c28b]">
                {user.username[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-100">{user.username}</p>
                <p className="text-xs text-stone-400">{getRoleLabel(user.role)}</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <div className="space-y-5">
            {visibleSections.map((section) => (
              <div key={section.title}>
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                  {section.title}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            "group flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-150",
                            isActive
                              ? "bg-[#f4c28b] text-[#1b1814] shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
                              : "text-stone-300 hover:bg-white/6 hover:text-white"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors",
                              isActive
                                ? "border-black/10 bg-white/40"
                                : "border-white/10 bg-white/5 group-hover:border-white/20"
                            )}
                          >
                            <Icon className="h-[18px] w-[18px]" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{item.label}</p>
                          </div>
                          {isActive && <span className="h-2.5 w-2.5 rounded-full bg-[#1b1814]" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/10 px-3 py-3 text-sm text-stone-300 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5">
              <LogOut className="h-[18px] w-[18px]" />
            </span>
            ออกจากระบบ
          </button>
        </div>
      </aside>
    </>
  );
}
