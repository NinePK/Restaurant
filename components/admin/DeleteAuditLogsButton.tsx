"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function DeleteAuditLogsButton() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm("ลบประวัติการใช้งานทั้งหมดทันทีใช่ไหม? การกระทำนี้ย้อนกลับไม่ได้");
    if (!confirmed) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/audit-logs", { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "ลบประวัติไม่สำเร็จ");
      }

      toast.success(`ลบประวัติแล้ว ${data.deletedCount || 0} รายการ`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ลบประวัติไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Button
      type="button"
      variant="destructive"
      className="w-fit rounded-full"
      onClick={handleDelete}
      disabled={deleting}
    >
      <Trash2 className="h-4 w-4" />
      {deleting ? "กำลังลบ..." : "ลบทั้งหมดทันที"}
    </Button>
  );
}
