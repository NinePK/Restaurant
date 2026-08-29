"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calculator, CalendarDays, Loader2, Save, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, getWageTypeLabel } from "@/lib/utils";

interface PayrollRow {
  staffProfile: {
    id: string;
    name: string;
    position: string | null;
    wageType: string;
    wageRate: number;
  };
  totalDays: number;
  totalHours: number;
  totalWage: number;
  netWage: number;
  saved: { id: string } | null;
}

const monthOptions = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export default function PayrollPage() {
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const summary = useMemo(
    () => ({
      staffCount: rows.length,
      totalDays: rows.reduce((sum, row) => sum + row.totalDays, 0),
      totalHours: rows.reduce((sum, row) => sum + row.totalHours, 0),
      netWage: rows.reduce((sum, row) => sum + row.netWage, 0),
      savedCount: rows.filter((row) => row.saved).length,
    }),
    [rows]
  );

  const periodLabel = `${monthOptions[Number(month) - 1] || "-"} ${Number(year) + 543}`;

  const loadPayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?month=${month}&year=${year}`);
      const data = await res.json();
      setRows(data.rows || []);
    } catch {
      toast.error("โหลดเงินเดือนไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePayroll = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: Number(month), year: Number(year) }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "บันทึกเงินเดือนไม่สำเร็จ");
        return;
      }

      toast.success("บันทึกสรุปเงินเดือนแล้ว");
      loadPayroll();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <section className="panel-surface p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div>
            <p className="section-eyebrow">รอบเงินเดือน</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#17211f]">
              {periodLabel}
            </h2>
            <p className="mt-2 text-sm text-[#66736c]">
              ระบบคำนวณจากข้อมูลเช็กชื่อในเดือนที่เลือก
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[180px_130px_auto_auto] sm:items-end">
            <div className="space-y-2">
              <Label>เดือน</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="rounded-2xl bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((label, index) => (
                    <SelectItem key={label} value={String(index + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ปี ค.ศ.</Label>
              <Input
                className="rounded-2xl bg-white"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-11 rounded-2xl bg-white" onClick={loadPayroll}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              คำนวณ
            </Button>
            <Button className="h-11 rounded-2xl" onClick={savePayroll} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              บันทึกรอบนี้
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricTile label="พนักงาน" value={summary.staffCount.toString()} helper="คนที่ active" />
        <MetricTile label="วันทำงานรวม" value={summary.totalDays.toString()} helper="นับจากเช็กชื่อ" />
        <MetricTile label="ชั่วโมงรวม" value={summary.totalHours.toFixed(1)} helper="เข้า-ออกงาน" />
        <MetricTile label="ยอดต้องจ่าย" value={formatCurrency(summary.netWage)} helper={`${summary.savedCount}/${summary.staffCount} บันทึกแล้ว`} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="panel-surface h-fit p-5">
          <p className="section-eyebrow">วิธีคำนวณ</p>
          <h3 className="mt-2 text-lg font-semibold text-[#17211f]">สูตรที่ใช้</h3>
          <div className="mt-4 space-y-3 text-sm">
            <FormulaCard title="รายวัน" text="จำนวนวันที่มา x ค่าแรงต่อวัน" />
            <FormulaCard title="รายชั่วโมง" text="ชั่วโมงทำงาน x ค่าแรงต่อชั่วโมง" />
            <FormulaCard title="รายเดือน" text="ใช้ค่าแรงรายเดือนเต็มจำนวน" />
          </div>
          <div className="mt-5 rounded-[1.25rem] border border-[#dfd0bd] bg-[#fbf7ef] p-4 text-sm text-[#66736c]">
            ปุ่ม “คำนวณ” แค่ดูตัวเลขล่าสุด ส่วน “บันทึกรอบนี้” จะเก็บยอดลงฐานข้อมูล
          </div>
        </aside>

        <div className="panel-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-eyebrow">รายการจ่าย</p>
              <h2 className="mt-2 text-xl font-semibold text-[#17211f]">พนักงานแต่ละคน</h2>
            </div>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-[#b96526]" />}
          </div>

          <div className="space-y-3">
            {rows.map((row) => (
              <PayrollCard key={row.staffProfile.id} row={row} />
            ))}

            {!loading && rows.length === 0 && (
              <div className="panel-muted p-8 text-center text-sm text-muted-foreground">
                ยังไม่มีพนักงานสำหรับคำนวณเงินเดือน
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function PayrollCard({ row }: { row: PayrollRow }) {
  const formula = getFormulaText(row);

  return (
    <div className="rounded-[1.4rem] border border-[#dfd0bd] bg-[#fbf7ef] p-4">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[#17211f]">{row.staffProfile.name}</p>
            <Badge variant={row.saved ? "success" : "secondary"}>
              {row.saved ? "บันทึกแล้ว" : "ยังไม่บันทึก"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[#66736c]">
            {row.staffProfile.position || "-"} · {getWageTypeLabel(row.staffProfile.wageType)}
          </p>
          <p className="mt-2 text-sm font-medium text-[#17211f]">{formula}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-4 2xl:min-w-[560px]">
          <MiniMetric label="ค่าแรง" value={formatCurrency(row.staffProfile.wageRate)} />
          <MiniMetric label="วัน" value={row.totalDays.toString()} />
          <MiniMetric label="ชั่วโมง" value={row.totalHours.toFixed(1)} />
          <MiniMetric label="จ่ายสุทธิ" value={formatCurrency(row.netWage)} strong />
        </div>
      </div>
    </div>
  );
}

function getFormulaText(row: PayrollRow) {
  if (row.staffProfile.wageType === "MONTHLY") {
    return `รายเดือน: ${formatCurrency(row.staffProfile.wageRate)}`;
  }

  if (row.staffProfile.wageType === "HOURLY") {
    return `รายชั่วโมง: ${row.totalHours.toFixed(1)} ชม. x ${formatCurrency(row.staffProfile.wageRate)}`;
  }

  return `รายวัน: ${row.totalDays} วัน x ${formatCurrency(row.staffProfile.wageRate)}`;
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

function FormulaCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[#dfd0bd] bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff1df] text-[#b96526]">
          <WalletCards className="h-4 w-4" />
        </div>
        <div>
          <p className="font-semibold text-[#17211f]">{title}</p>
          <p className="mt-1 text-[#66736c]">{text}</p>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3">
      <p className="text-xs text-[#66736c]">{label}</p>
      <p className={strong ? "text-lg font-semibold text-[#17211f]" : "font-semibold text-[#17211f]"}>
        {value}
      </p>
    </div>
  );
}
