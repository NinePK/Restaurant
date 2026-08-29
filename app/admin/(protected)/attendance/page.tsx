"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Clock3, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBangkokDateInput } from "@/lib/business-time";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Staff {
  id: string;
  name: string;
  position: string | null;
  isActive: boolean;
}

interface Attendance {
  id: string;
  staffProfileId: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "PRESENT" | "LATE" | "ABSENT" | "LEAVE";
  note: string | null;
}

const statusConfig = {
  PRESENT: { label: "เข้างาน", badge: "success" as const, className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  LATE: { label: "สาย", badge: "orange" as const, className: "border-orange-200 bg-orange-50 text-orange-800" },
  LEAVE: { label: "ลา", badge: "info" as const, className: "border-blue-200 bg-blue-50 text-blue-800" },
  ABSENT: { label: "ขาด", badge: "destructive" as const, className: "border-red-200 bg-red-50 text-red-800" },
};

type AttendanceAction = "CHECK_IN" | "CHECK_OUT" | "LATE" | "ABSENT" | "LEAVE";

export default function AttendancePage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [date, setDate] = useState(() => formatBangkokDateInput(new Date()));
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const attendanceByStaff = useMemo(
    () => new Map(attendance.map((item) => [item.staffProfileId, item])),
    [attendance]
  );

  const summary = useMemo(
    () => ({
      checkedIn: attendance.filter((item) => item.checkIn).length,
      checkedOut: attendance.filter((item) => item.checkOut).length,
      missing: staff.filter((person) => person.isActive && !attendanceByStaff.get(person.id)?.checkIn).length,
    }),
    [attendance, attendanceByStaff, staff]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, attendanceRes] = await Promise.all([
        fetch("/api/staff"),
        fetch(`/api/attendance?date=${date}`),
      ]);
      setStaff(await staffRes.json());
      setAttendance(await attendanceRes.json());
    } catch {
      toast.error("โหลดข้อมูลเวลาเข้างานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const markAttendance = async (staffProfileId: string, action: AttendanceAction) => {
    setUpdatingId(staffProfileId);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffProfileId, date, action }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "บันทึกเวลาไม่สำเร็จ");
        return;
      }
      toast.success(action === "CHECK_OUT" ? "เช็กเอาต์แล้ว" : "บันทึกสถานะแล้ว");
      loadData();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <section className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <div className="metric-tile">
          <p className="metric-label">เช็กอิน</p>
          <p className="metric-value">{summary.checkedIn}</p>
          <p className="metric-helper">คน</p>
        </div>
        <div className="metric-tile">
          <p className="metric-label">เช็กเอาต์</p>
          <p className="metric-value">{summary.checkedOut}</p>
          <p className="metric-helper">คน</p>
        </div>
        <div className="metric-tile">
          <p className="metric-label">ยังไม่มา</p>
          <p className="metric-value">{summary.missing}</p>
          <p className="metric-helper">คน</p>
        </div>
        <div className="panel-surface flex items-center gap-3 p-4">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {loading && <Loader2 className="h-5 w-5 animate-spin text-[#b96526]" />}
        </div>
      </section>

      <section className="panel-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="section-eyebrow">เวลาเข้างาน</p>
            <h2 className="mt-2 text-xl font-semibold text-[#17211f]">รายการวันนี้</h2>
          </div>
          <Button variant="outline" className="rounded-full" onClick={loadData}>
            โหลดใหม่
          </Button>
        </div>

        <div className="space-y-3">
          {staff
            .filter((person) => person.isActive)
            .map((person) => {
              const record = attendanceByStaff.get(person.id);
              const busy = updatingId === person.id;
              const config = record ? statusConfig[record.status] : null;

              return (
                <div key={person.id} className="rounded-[1.4rem] border border-[#dfd0bd] bg-[#fbf7ef] p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#b96526]">
                        <Clock3 className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[#17211f]">{person.name}</p>
                          <Badge variant={config?.badge || "secondary"}>
                            {config?.label || "ยังไม่เช็ก"}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#66736c]">{person.position || "-"}</p>
                      </div>
                    </div>

                    <div className="grid gap-3 xl:grid-cols-[92px_92px_minmax(360px,auto)] xl:items-center">
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs text-[#66736c]">เข้า</p>
                        <p className="font-semibold">{record?.checkIn ? formatTime(record.checkIn) : "-"}</p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <p className="text-xs text-[#66736c]">ออก</p>
                        <p className="font-semibold">{record?.checkOut ? formatTime(record.checkOut) : "-"}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        <StatusButton
                          label="เข้างาน"
                          active={record?.status === "PRESENT"}
                          className={statusConfig.PRESENT.className}
                          disabled={busy}
                          onClick={() => markAttendance(person.id, "CHECK_IN")}
                        />
                        <StatusButton
                          label="สาย"
                          active={record?.status === "LATE"}
                          className={statusConfig.LATE.className}
                          disabled={busy}
                          onClick={() => markAttendance(person.id, "LATE")}
                        />
                        <StatusButton
                          label="ลา"
                          active={record?.status === "LEAVE"}
                          className={statusConfig.LEAVE.className}
                          disabled={busy}
                          onClick={() => markAttendance(person.id, "LEAVE")}
                        />
                        <StatusButton
                          label="ขาด"
                          active={record?.status === "ABSENT"}
                          className={statusConfig.ABSENT.className}
                          disabled={busy}
                          onClick={() => markAttendance(person.id, "ABSENT")}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-11 rounded-2xl bg-white"
                          onClick={() => markAttendance(person.id, "CHECK_OUT")}
                          disabled={busy || !record?.checkIn}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          ออกงาน
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
}

function StatusButton({
  label,
  active,
  className,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  className: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        "h-11 rounded-2xl border bg-white font-semibold transition",
        active ? className : "border-[#dfd0bd] text-[#17211f]"
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
