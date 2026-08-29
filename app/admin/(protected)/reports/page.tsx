"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BarChart3, CalendarDays, Loader2, Receipt, Trophy, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBangkokDateInput } from "@/lib/business-time";
import { formatCurrency, formatDateTime, getPaymentMethodLabel } from "@/lib/utils";

interface SalesReport {
  summary: {
    totalRevenue: number;
    billCount: number;
    totalDiscount: number;
    totalVat: number;
    totalServiceCharge: number;
  };
  payments: { method: string; amount: number; count: number }[];
  topItems: { name: string; quantity: number; amount: number }[];
  daily: { date: string; amount: number; count: number }[];
  recentBills: {
    id: string;
    billNumber: string;
    tableName: string;
    grandTotal: number;
    paymentMethod: string;
    paidAt: string | null;
    createdAt: string;
  }[];
}

function getDateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatBangkokDateInput(date);
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => getDateDaysAgo(6));
  const [endDate, setEndDate] = useState(() => formatBangkokDateInput(new Date()));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);

  const maxPayment = useMemo(
    () => Math.max(...(report?.payments.map((payment) => payment.amount) || [0]), 1),
    [report]
  );
  const maxDaily = useMemo(
    () => Math.max(...(report?.daily.map((day) => day.amount) || [0]), 1),
    [report]
  );

  const loadReport = async (range?: { startDate: string; endDate: string }) => {
    setLoading(true);
    try {
      const activeStartDate = range?.startDate ?? startDate;
      const activeEndDate = range?.endDate ?? endDate;
      const params = new URLSearchParams({ startDate: activeStartDate, endDate: activeEndDate });
      const res = await fetch(`/api/reports/sales?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load report");
      }
      const data = await res.json();
      setReport(data);
    } catch {
      toast.error("โหลดรายงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyRange = (days: number) => {
    const nextRange = {
      startDate: getDateDaysAgo(days),
      endDate: formatBangkokDateInput(new Date()),
    };
    setStartDate(nextRange.startDate);
    setEndDate(nextRange.endDate);
    loadReport(nextRange);
  };

  return (
    <div className="space-y-6 fade-in">
      <section className="panel-surface p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="section-eyebrow">รายงาน</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#17211f]">
              ยอดขายและเมนูขายดี
            </h2>
            <p className="mt-2 text-sm text-[#66736c]">
              ใช้ดูภาพรวมย้อนหลัง ไม่ใช่หน้าทำงานสดแบบแดชบอร์ด
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[auto_auto_auto_auto_auto] md:items-end">
            <div className="space-y-2">
              <Label>เริ่มวันที่</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>ถึงวันที่</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button variant="outline" className="h-11 rounded-2xl bg-white" onClick={() => applyRange(0)}>
              วันนี้
            </Button>
            <Button variant="outline" className="h-11 rounded-2xl bg-white" onClick={() => applyRange(6)}>
              7 วัน
            </Button>
            <Button className="h-11 rounded-2xl" onClick={() => loadReport()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              ดูรายงาน
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <MetricTile label="ยอดขาย" value={formatCurrency(report?.summary.totalRevenue || 0)} helper="รวมสุทธิ" />
        <MetricTile label="จำนวนบิล" value={String(report?.summary.billCount || 0)} helper="ใบ" />
        <MetricTile label="ส่วนลด" value={formatCurrency(report?.summary.totalDiscount || 0)} helper="รวมโปร/ส่วนลด" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="panel-surface p-5">
          <SectionTitle icon={WalletCards} title="ช่องทางชำระเงิน" />
          <div className="mt-4 space-y-3">
            {report?.payments.map((payment) => (
              <div key={payment.method} className="rounded-[1.25rem] border border-[#dfd0bd] bg-[#fbf7ef] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#17211f]">{getPaymentMethodLabel(payment.method)}</p>
                    <p className="text-sm text-[#66736c]">{payment.count} บิล</p>
                  </div>
                  <p className="font-semibold text-[#17211f]">{formatCurrency(payment.amount)}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#eadfce]">
                  <div
                    className="h-full rounded-full bg-[#f5a45b]"
                    style={{ width: `${Math.round((payment.amount / maxPayment) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {report?.payments.length === 0 && <EmptyState text="ยังไม่มีข้อมูลชำระเงินในช่วงนี้" />}
          </div>
        </div>

        <div className="panel-surface p-5">
          <SectionTitle icon={Trophy} title="เมนูขายดี" />
          <div className="mt-4 space-y-3">
            {report?.topItems.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-[#dfd0bd] bg-[#fbf7ef] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white font-semibold text-[#b96526]">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-[#17211f]">{item.name}</p>
                    <p className="text-sm text-[#66736c]">{item.quantity} จาน</p>
                  </div>
                </div>
                <p className="font-semibold text-[#17211f]">{formatCurrency(item.amount)}</p>
              </div>
            ))}
            {report?.topItems.length === 0 && <EmptyState text="ยังไม่มีเมนูขายดีในช่วงนี้" />}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel-surface p-5">
          <SectionTitle icon={CalendarDays} title="ยอดขายรายวัน" />
          <div className="mt-4 space-y-3">
            {report?.daily.map((day) => (
              <div key={day.date} className="rounded-[1.25rem] border border-[#dfd0bd] bg-[#fbf7ef] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#17211f]">{day.date}</p>
                    <p className="text-sm text-[#66736c]">{day.count} บิล</p>
                  </div>
                  <p className="font-semibold text-[#17211f]">{formatCurrency(day.amount)}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#eadfce]">
                  <div
                    className="h-full rounded-full bg-[#17211f]"
                    style={{ width: `${Math.round((day.amount / maxDaily) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {report?.daily.length === 0 && <EmptyState text="ยังไม่มียอดขายในช่วงนี้" />}
          </div>
        </div>

        <div className="panel-surface p-5">
          <SectionTitle icon={Receipt} title="บิลล่าสุดในช่วงนี้" />
          <div className="mt-4 space-y-3">
            {report?.recentBills.map((bill) => (
              <div key={bill.id} className="rounded-[1.25rem] border border-[#dfd0bd] bg-[#fbf7ef] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[#17211f]">{bill.billNumber}</p>
                    <p className="text-sm text-[#66736c]">
                      {bill.tableName} · {formatDateTime(bill.paidAt || bill.createdAt)}
                    </p>
                    <p className="mt-1 text-sm text-[#66736c]">{getPaymentMethodLabel(bill.paymentMethod)}</p>
                  </div>
                  <p className="font-semibold text-[#17211f]">{formatCurrency(bill.grandTotal)}</p>
                </div>
              </div>
            ))}
            {report?.recentBills.length === 0 && <EmptyState text="ยังไม่มีบิลในช่วงนี้" />}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="metric-tile">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-helper">{helper}</p>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1df] text-[#b96526]">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold text-[#17211f]">{title}</h3>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="panel-muted p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
