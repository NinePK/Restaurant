export const permissionItems = [
  { key: "dashboard", label: "แดชบอร์ด", section: "งานหน้าร้าน" },
  { key: "orders", label: "ออเดอร์", section: "งานหน้าร้าน" },
  { key: "kitchen", label: "หน้าจอครัว", section: "งานหน้าร้าน" },
  { key: "billing", label: "ออกบิล", section: "งานหน้าร้าน" },
  { key: "bills", label: "ประวัติบิล", section: "งานหน้าร้าน" },
  { key: "menu", label: "เมนูอาหาร", section: "เมนูและพื้นที่ขาย" },
  { key: "categories", label: "หมวดหมู่", section: "เมนูและพื้นที่ขาย" },
  { key: "promotions", label: "โปรโมชั่น", section: "เมนูและพื้นที่ขาย" },
  { key: "tables", label: "โต๊ะและ QR", section: "เมนูและพื้นที่ขาย" },
  { key: "staff", label: "พนักงาน", section: "ทีมงาน" },
  { key: "attendance", label: "เวลาเข้างาน", section: "ทีมงาน" },
  { key: "payroll", label: "เงินเดือน", section: "ทีมงาน" },
  { key: "reports", label: "รายงาน", section: "การควบคุม" },
  { key: "settings", label: "ตั้งค่าร้าน", section: "การควบคุม" },
  { key: "audit-logs", label: "ประวัติการใช้งาน", section: "การควบคุม" },
] as const;

export type PermissionKey = (typeof permissionItems)[number]["key"];

export const allPermissions = permissionItems.map((item) => item.key);

export const defaultPermissionsByRole: Record<string, PermissionKey[]> = {
  OWNER: allPermissions,
  ADMIN: allPermissions,
  MANAGER: allPermissions.filter((key) => key !== "settings" && key !== "audit-logs"),
  CASHIER: ["dashboard", "orders", "billing", "bills", "menu", "categories", "promotions", "tables"],
  KITCHEN: ["kitchen"],
  STAFF: ["attendance"],
};

export const routePermissionMap: Record<string, PermissionKey> = {
  "/admin/dashboard": "dashboard",
  "/admin/orders": "orders",
  "/admin/kitchen": "kitchen",
  "/admin/billing": "billing",
  "/admin/bills": "bills",
  "/admin/menu": "menu",
  "/admin/categories": "categories",
  "/admin/promotions": "promotions",
  "/admin/tables": "tables",
  "/admin/staff": "staff",
  "/admin/attendance": "attendance",
  "/admin/payroll": "payroll",
  "/admin/reports": "reports",
  "/admin/settings": "settings",
  "/admin/audit-logs": "audit-logs",
};

export function getEffectivePermissions(role: string, permissions?: string[] | null) {
  if (permissions?.length) return permissions;
  return defaultPermissionsByRole[role] || [];
}

export function canAccessPermission(role: string, permissions: string[] | undefined | null, permission: string) {
  if (role === "OWNER" || role === "ADMIN") return true;
  return getEffectivePermissions(role, permissions).includes(permission as PermissionKey);
}
