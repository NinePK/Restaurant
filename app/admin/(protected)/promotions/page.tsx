"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { getPromotionDiscountLabel } from "@/lib/promotion-utils";
import { formatBangkokDateInput } from "@/lib/business-time";

const optionalNumberField = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number().min(0).optional()
);

const promoSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อโปรโมชัน"),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isActive: z.boolean().default(true),
  discountType: z.enum(["flat", "percent"]).optional(),
  discountValue: optionalNumberField,
  minOrderAmount: optionalNumberField,
  autoApply: z.boolean().default(false),
  canStack: z.boolean().default(false),
});

type PromoForm = z.infer<typeof promoSchema>;

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  discountType: "flat" | "percent" | null;
  discountValue: number | null;
  minOrderAmount: number | null;
  autoApply: boolean;
  canStack: boolean;
}

export default function PromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<PromoForm>({ resolver: zodResolver(promoSchema) });

  const isActive = watch("isActive");
  const autoApply = watch("autoApply");
  const canStack = watch("canStack");
  const discountType = watch("discountType");

  const fetchPromos = async () => {
    try {
      const res = await fetch("/api/promotions");
      setPromos(await res.json());
    } catch {
      toast.error("โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const openCreate = () => {
    setSelectedPromo(null);
    reset({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      isActive: true,
      discountType: undefined,
      discountValue: undefined,
      minOrderAmount: undefined,
      autoApply: false,
      canStack: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (promo: Promotion) => {
    setSelectedPromo(promo);
    reset({
      name: promo.name,
      description: promo.description || "",
      startDate: formatBangkokDateInput(promo.startDate),
      endDate: formatBangkokDateInput(promo.endDate),
      isActive: promo.isActive,
      discountType: promo.discountType || undefined,
      discountValue: promo.discountValue ?? undefined,
      minOrderAmount: promo.minOrderAmount ?? undefined,
      autoApply: promo.autoApply,
      canStack: promo.canStack,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (data: PromoForm) => {
    setIsSubmitting(true);
    try {
      const url = selectedPromo ? `/api/promotions/${selectedPromo.id}` : "/api/promotions";
      const method = selectedPromo ? "PUT" : "POST";
      const payload = {
        ...data,
        discountType: data.discountType ?? null,
        discountValue: data.discountType ? data.discountValue ?? null : null,
        minOrderAmount: data.minOrderAmount ?? null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "บันทึกโปรโมชันไม่สำเร็จ");
        return;
      }

      toast.success(selectedPromo ? "แก้ไขโปรโมชันสำเร็จ" : "เพิ่มโปรโมชันสำเร็จ");
      setDialogOpen(false);
      fetchPromos();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">โปรโมชัน</h1>
          <p className="text-muted-foreground text-sm mt-1">
            ตั้งค่าโปรที่แสดงหน้าลูกค้า และใช้งานต่อที่แคชเชียร์ได้ในกติกาเดียวกัน
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4" /> เพิ่มโปรโมชัน</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : promos.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Megaphone className="w-12 h-12 mb-3 opacity-30" />
          <p>ยังไม่มีโปรโมชัน</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {promos.map((promo) => {
            const now = new Date();
            const isExpired = promo.endDate && new Date(promo.endDate) < now;

            return (
              <Card key={promo.id} className="card-hover">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100">
                    <Megaphone className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{promo.name}</span>
                      <Badge variant={promo.isActive && !isExpired ? "success" : "secondary"}>
                        {isExpired ? "หมดอายุ" : promo.isActive ? "ใช้งาน" : "ปิด"}
                      </Badge>
                      {promo.discountType && promo.discountValue !== null && (
                        <Badge variant="info">{getPromotionDiscountLabel(promo)}</Badge>
                      )}
                      {promo.autoApply && <Badge variant="orange">บังคับใช้</Badge>}
                      {promo.canStack && <Badge variant="warning">ซ้อนโปรได้</Badge>}
                    </div>
                    {promo.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">{promo.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {promo.startDate ? formatDate(promo.startDate) : "ไม่กำหนด"} —{" "}
                      {promo.endDate ? formatDate(promo.endDate) : "ไม่กำหนด"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {promo.minOrderAmount
                        ? `ใช้ได้เมื่อยอดครบ ${promo.minOrderAmount.toLocaleString("th-TH")} บาท`
                        : "ไม่มียอดขั้นต่ำ"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(promo)}>
                      <Pencil className="w-3 h-3" /> แก้ไข
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                      onClick={() => { setSelectedPromo(promo); setDeleteDialogOpen(true); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedPromo ? "แก้ไขโปรโมชัน" : "เพิ่มโปรโมชัน"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label>ชื่อโปรโมชัน *</Label>
              <Input {...register("name")} placeholder="เช่น ลดทั้งบิล 10% ตลอดเดือน" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Textarea {...register("description")} rows={2} placeholder="รายละเอียดโปรโมชัน..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>วันที่เริ่ม</Label>
                <Input type="date" {...register("startDate")} />
              </div>
              <div className="space-y-2">
                <Label>วันที่สิ้นสุด</Label>
                <Input type="date" {...register("endDate")} />
              </div>
            </div>

            <div className="panel-muted p-4">
              <p className="text-sm font-medium text-[hsl(var(--admin-ink))]">การใช้งานที่แคชเชียร์</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ถ้าต้องการให้โปรนี้มาเลือกในส่วนลดของแคชเชียร์ ให้ตั้งค่าประเภทส่วนลดและมูลค่าไว้
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-[0.9fr_1.1fr_1fr]">
                <div className="space-y-2">
                  <Label>ประเภทส่วนลด</Label>
                  <Select
                    value={discountType || "none"}
                    onValueChange={(value) =>
                      setValue("discountType", value === "none" ? undefined : (value as "flat" | "percent"))
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="ยังไม่ตั้งค่า" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ยังไม่ตั้งค่า</SelectItem>
                      <SelectItem value="flat">ลดเป็นบาท</SelectItem>
                      <SelectItem value="percent">ลดเป็นเปอร์เซ็นต์</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>มูลค่าส่วนลด</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("discountValue")}
                    disabled={!discountType}
                    placeholder={discountType === "percent" ? "เช่น 10" : "เช่น 100"}
                    className="bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label>ยอดขั้นต่ำ (ถ้ามี)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("minOrderAmount")}
                    placeholder="เช่น 1500"
                    className="bg-white"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--admin-ink))]">บังคับใช้ส่วนลดอัตโนมัติ</p>
                    <p className="text-xs text-muted-foreground">เมื่อเข้าเงื่อนไข ระบบจะเลือกโปรนี้ให้อัตโนมัติที่แคชเชียร์</p>
                  </div>
                  <Switch checked={autoApply} onCheckedChange={(value) => setValue("autoApply", value)} />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--admin-ink))]">ใช้ร่วมกับโปรอื่นได้</p>
                    <p className="text-xs text-muted-foreground">ค่าเริ่มต้นคือไม่ให้ซ้อนกับโปรอื่น เพื่อกันคิดส่วนลดเกินโดยไม่ตั้งใจ</p>
                  </div>
                  <Switch checked={canStack} onCheckedChange={(value) => setValue("canStack", value)} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={isActive} onCheckedChange={(value) => setValue("isActive", value)} />
              <Label>เปิดใช้งาน</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {selectedPromo ? "บันทึก" : "เพิ่ม"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบโปรโมชัน</DialogTitle>
            <DialogDescription>ต้องการลบโปรโมชัน <strong>{selectedPromo?.name}</strong>?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={async () => {
              if (!selectedPromo) return;
              const res = await fetch(`/api/promotions/${selectedPromo.id}`, { method: "DELETE" });
              if (res.ok) {
                toast.success("ลบโปรโมชันสำเร็จ");
                fetchPromos();
              }
              setDeleteDialogOpen(false);
            }}>ลบ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
