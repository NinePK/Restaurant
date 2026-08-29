"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Sparkles,
  Table2,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import ReceiptPreview, { printReceiptElement } from "@/components/admin/ReceiptPreview";

interface BillItem {
  id: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  note: string | null;
  createdAt: string;
}

interface PromotionSummaryItem {
  id: string;
  name: string;
  discountType: "flat" | "percent" | string | null;
  discountValue: number | null;
  discountAmount: number;
}

interface Bill {
  id: string;
  billNumber: string;
  subtotal: number;
  discount: number;
  discountType: string | null;
  promotionSummary: PromotionSummaryItem[] | null;
  serviceCharge: number;
  vat: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  isPaid: boolean;
  paidAt: string | null;
  note: string | null;
  receiptFooter: string | null;
  createdAt: string;
  table: { name: string };
  createdBy: { username: string } | null;
  items: BillItem[];
  payments: Payment[];
}

interface Table {
  id: string;
  name: string;
}

type PaymentMethod = "CASH" | "BANK_TRANSFER" | "PROMPTPAY" | "CARD";
type PaymentFilter = PaymentMethod | "ALL";

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "เงินสด",
  BANK_TRANSFER: "โอนเงิน",
  PROMPTPAY: "พร้อมเพย์",
  CARD: "บัตร",
};

const paymentIcons: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
  CASH: Banknote,
  BANK_TRANSFER: WalletCards,
  PROMPTPAY: Sparkles,
  CARD: CreditCard,
};

const quickRanges = [
  { label: "วันนี้", days: 0 },
  { label: "7 วัน", days: 6 },
  { label: "30 วัน", days: 29 },
];
const BILLS_PER_PAGE = 10;

function getInputDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export default function BillsPage() {
  const today = useMemo(() => getInputDate(new Date()), []);
  const [bills, setBills] = useState<Bill[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedBillId, setSelectedBillId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [tableId, setTableId] = useState("ALL");
  const [paymentMethod, setPaymentMethod] = useState<PaymentFilter>("ALL");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const selectedBill = bills.find((bill) => bill.id === selectedBillId) ?? bills[0] ?? null;
  const pageCount = Math.max(Math.ceil(bills.length / BILLS_PER_PAGE), 1);
  const paginatedBills = bills.slice((page - 1) * BILLS_PER_PAGE, page * BILLS_PER_PAGE);

  const totals = useMemo(
    () => ({
      revenue: bills.reduce((sum, bill) => sum + bill.grandTotal, 0),
      discount: bills.reduce((sum, bill) => sum + bill.discount, 0),
      itemCount: bills.reduce(
        (sum, bill) => sum + bill.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
      ),
    }),
    [bills]
  );

  const paymentBreakdown = useMemo(() => {
    return bills.reduce(
      (summary, bill) => {
        summary[bill.paymentMethod] = (summary[bill.paymentMethod] || 0) + bill.grandTotal;
        return summary;
      },
      {} as Record<PaymentMethod, number>
    );
  }, [bills]);

  const loadBills = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({ limit: "150" });
      if (query.trim()) params.set("q", query.trim());
      if (tableId !== "ALL") params.set("tableId", tableId);
      if (paymentMethod !== "ALL") params.set("paymentMethod", paymentMethod);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const [billResponse, tableResponse] = await Promise.all([
        fetch(`/api/billing?${params.toString()}`),
        tables.length ? Promise.resolve(null) : fetch("/api/tables"),
      ]);

      if (!billResponse.ok) throw new Error("Failed to load bills");

      const billData = await billResponse.json();
      setBills(billData);
      setPage(1);
      setSelectedBillId((current) =>
        billData.some((bill: Bill) => bill.id === current) ? current : billData[0]?.id ?? ""
      );

      if (tableResponse) {
        const tableData = await tableResponse.json();
        setTables(tableData);
      }
    } catch {
      toast.error("โหลดประวัติบิลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  const applyQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(getInputDate(start));
    setEndDate(getInputDate(end));
  };

  const handlePrint = () => {
    if (!selectedBill) return;
    printReceiptElement("bill-history-receipt");
  };

  return (
    <div className="space-y-6">
      <section className="panel-surface overflow-hidden p-0">
        <div className="relative p-6 sm:p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-bl-full bg-[#f5a45b]/20 blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker">Bills</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#17211f]">
                ประวัติบิล
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              {quickRanges.map((range) => (
                <Button
                  key={range.label}
                  type="button"
                  variant="outline"
                  className="rounded-full bg-white/70"
                  onClick={() => applyQuickRange(range.days)}
                >
                  {range.label}
                </Button>
              ))}
              <Button onClick={loadBills} className="rounded-full bg-[#17211f] text-white hover:bg-[#263733]">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                โหลดใหม่
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="metric-tile">
          <p className="metric-label">ยอดขาย</p>
          <p className="metric-value">{formatCurrency(totals.revenue)}</p>
          <p className="metric-helper">{bills.length} บิล</p>
        </div>
        <div className="metric-tile">
          <p className="metric-label">ส่วนลดทั้งหมด</p>
          <p className="metric-value">{formatCurrency(totals.discount)}</p>
          <p className="metric-helper">ส่วนลด</p>
        </div>
        <div className="metric-tile">
          <p className="metric-label">จำนวนจาน</p>
          <p className="metric-value">{totals.itemCount}</p>
          <p className="metric-helper">จาน</p>
        </div>
      </section>

      <section className="panel-surface p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]">
          <div className="space-y-2">
            <Label htmlFor="bill-search">ค้นหา</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#78847d]" />
              <Input
                id="bill-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") loadBills();
                }}
                placeholder="เลขบิล, โต๊ะ, หมายเหตุ"
                className="h-11 rounded-2xl pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>โต๊ะ</Label>
            <Select value={tableId} onValueChange={setTableId}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="ทุกโต๊ะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกโต๊ะ</SelectItem>
                {tables.map((table) => (
                  <SelectItem key={table.id} value={table.id}>
                    {table.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>ช่องทางจ่าย</Label>
            <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentFilter)}>
              <SelectTrigger className="h-11 rounded-2xl">
                <SelectValue placeholder="ทุกช่องทาง" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ทุกช่องทาง</SelectItem>
                {Object.entries(paymentLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date">เริ่มวันที่</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">ถึงวันที่</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="flex items-end">
            <Button onClick={loadBills} className="h-11 w-full rounded-2xl bg-[#f5a45b] text-[#1b1814] hover:bg-[#e99747]">
              ค้นหา
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)]">
        <div className="panel-surface min-h-[460px] p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">รายการ</p>
              <h2 className="mt-1 text-xl font-semibold text-[#17211f]">รายการบิล</h2>
            </div>
            <Badge variant="secondary" className="rounded-full">
              แสดง {bills.length === 0 ? 0 : (page - 1) * BILLS_PER_PAGE + 1}-{Math.min(page * BILLS_PER_PAGE, bills.length)} จาก {bills.length}
            </Badge>
          </div>

          {loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-[1.5rem] bg-[#efe7db]" />
              ))}
            </div>
          ) : bills.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-[#d8c7b3] bg-[#fbf7ef] p-8 text-center">
              <ReceiptText className="h-10 w-10 text-[#b96526]" />
              <h3 className="mt-4 text-lg font-semibold text-[#17211f]">ยังไม่พบบิลในช่วงนี้</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedBills.map((bill) => {
                const Icon = paymentIcons[bill.paymentMethod];
                const active = selectedBill?.id === bill.id;

                return (
                  <button
                    key={bill.id}
                    onClick={() => setSelectedBillId(bill.id)}
                    className={cn(
                      "w-full rounded-[1.5rem] border p-4 text-left transition duration-150",
                      active
                        ? "border-[#17211f] bg-[#17211f] text-white shadow-[0_18px_40px_rgba(23,33,31,0.18)]"
                        : "border-[#dfd0bd] bg-[#fbf8f1] hover:border-[#b96526]/50 hover:bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{bill.billNumber}</span>
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-medium",
                              active ? "bg-white/15 text-white" : "bg-[#ecf7e8] text-[#33694b]"
                            )}
                          >
                            ชำระแล้ว
                          </span>
                        </div>
                        <div className={cn("mt-3 flex flex-wrap gap-3 text-sm", active ? "text-stone-200" : "text-[#66736c]")}>
                          <span className="inline-flex items-center gap-1.5">
                            <Table2 className="h-4 w-4" />
                            {bill.table.name}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-4 w-4" />
                            {formatDateTime(bill.paidAt || bill.createdAt)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Icon className="h-4 w-4" />
                            {paymentLabels[bill.paymentMethod]}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-lg font-semibold">{formatCurrency(bill.grandTotal)}</p>
                        <p className={cn("text-xs", active ? "text-stone-300" : "text-[#78847d]")}>
                          {bill.items.length} รายการ
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {pageCount > 1 && (
                <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[#dfd0bd] bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#66736c]">
                    หน้า {page} / {pageCount}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-full bg-white"
                      disabled={page === 1}
                      onClick={() => setPage((current) => Math.max(current - 1, 1))}
                    >
                      ก่อนหน้า
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 rounded-full bg-white"
                      disabled={page === pageCount}
                      onClick={() => setPage((current) => Math.min(current + 1, pageCount))}
                    >
                      ถัดไป
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="panel-surface sticky top-4 h-fit overflow-hidden p-0">
          {selectedBill ? (
            <>
              <div className="border-b border-[#dfd0bd] bg-[#fbf7ef] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="section-kicker">รายละเอียด</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#17211f]">
                      {selectedBill.billNumber}
                    </h2>
                    <p className="mt-2 text-sm text-[#66736c]">
                      โต๊ะ {selectedBill.table.name} • {formatDateTime(selectedBill.paidAt || selectedBill.createdAt)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full bg-white" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    พิมพ์
                  </Button>
                </div>
              </div>

              <div className="bg-[#f6efe4] p-5">
                <div id="bill-history-receipt">
                  <ReceiptPreview bill={selectedBill} />
                </div>
                <p className="mt-4 text-center text-xs text-[#66736c]">
                  ถ้าใช้เครื่องพิมพ์ใบเสร็จจริง ให้เลือก Paper size เป็น 80mm/Receipt ใน More settings
                </p>
              </div>
            </>
          ) : (
            <div className="flex min-h-[460px] flex-col items-center justify-center p-8 text-center">
              <ReceiptText className="h-10 w-10 text-[#b96526]" />
              <h3 className="mt-4 text-lg font-semibold text-[#17211f]">เลือกบิลเพื่อดูรายละเอียด</h3>
            </div>
          )}
        </aside>
      </section>

      {bills.length > 0 && (
        <section className="panel-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="section-kicker">ช่องทางจ่าย</p>
              <h2 className="mt-1 text-lg font-semibold text-[#17211f]">ยอดขายแยกตามช่องทาง</h2>
            </div>
            <ChevronRight className="h-5 w-5 text-[#78847d]" />
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {Object.entries(paymentLabels).map(([method, label]) => {
              const value = paymentBreakdown[method as PaymentMethod] || 0;
              const percent = totals.revenue ? Math.round((value / totals.revenue) * 100) : 0;

              return (
                <div key={method} className="rounded-[1.25rem] border border-[#dfd0bd] bg-[#fbf7ef] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[#17211f]">{label}</span>
                    <span className="text-sm text-[#66736c]">{percent}%</span>
                  </div>
                  <p className="mt-2 text-xl font-semibold text-[#17211f]">{formatCurrency(value)}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#eadfce]">
                    <div className="h-full rounded-full bg-[#f5a45b]" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
