import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { formatBangkokDateInput } from "@/lib/business-time";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy", { locale: th });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: th });
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return format(new Date(date), "HH:mm", { locale: th });
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: th });
}

export function formatThaiDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  const thaiYear = d.getFullYear() + 543;
  return format(d, `dd/MM/${thaiYear} HH:mm`, { locale: th });
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "รอรับออเดอร์",
    ACCEPTED: "รับออเดอร์แล้ว",
    PREPARING: "กำลังทำ",
    SERVED: "เสิร์ฟแล้ว",
    CANCELLED: "ยกเลิก",
  };
  return labels[status] || status;
}

export function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
    ACCEPTED: "bg-blue-100 text-blue-800 border-blue-200",
    PREPARING: "bg-orange-100 text-orange-800 border-orange-200",
    SERVED: "bg-green-100 text-green-800 border-green-200",
    CANCELLED: "bg-red-100 text-red-800 border-red-200",
  };
  return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: "เงินสด",
    BANK_TRANSFER: "โอนเงิน",
    PROMPTPAY: "พร้อมเพย์",
    CARD: "บัตรเครดิต/เดบิต",
  };
  return labels[method] || method;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    OWNER: "เจ้าของร้าน",
    ADMIN: "แอดมิน",
    MANAGER: "ผู้จัดการ",
    CASHIER: "แคชเชียร์",
    KITCHEN: "ครัว",
    STAFF: "พนักงาน",
  };
  return labels[role] || role;
}

export function getAttendanceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PRESENT: "มาทำงาน",
    LATE: "สาย",
    ABSENT: "ขาดงาน",
    LEAVE: "ลา",
  };
  return labels[status] || status;
}

export function getWageTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    DAILY: "รายวัน",
    HOURLY: "รายชั่วโมง",
    MONTHLY: "รายเดือน",
  };
  return labels[type] || type;
}

export function generateBillNumber(): string {
  const now = new Date();
  const [year, month, day] = formatBangkokDateInput(now).split("-");
  const time = String(now.getTime()).slice(-6);
  return `บิล-${day}${month}${year.slice(-2)}-${time}`;
}

export function calculateHoursWorked(checkIn: Date | null, checkOut: Date | null): number {
  if (!checkIn || !checkOut) return 0;
  const diffMs = checkOut.getTime() - checkIn.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
}
