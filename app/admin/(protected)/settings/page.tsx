"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const settingsSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อร้าน"),
  phone: z.string().optional(),
  lineId: z.string().optional(),
  address: z.string().optional(),
  themeColor: z.string(),
  serviceChargeEnabled: z.boolean(),
  serviceChargePercent: z.coerce.number().min(0).max(100),
  vatEnabled: z.boolean(),
  vatPercent: z.coerce.number().min(0).max(100),
  receiptFooter: z.string().optional(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

const demoValues = new Set([
  "02-xxx-xxxx",
  "@lineid",
  "123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
]);

function toEditableValue(value?: string | null) {
  if (!value || demoValues.has(value)) return "";
  return value;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingLogo, setIsDeletingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>("");

  const {
    register, handleSubmit, reset, watch, setValue,
    formState: { errors },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      themeColor: "#E85D04",
      serviceChargeEnabled: false,
      serviceChargePercent: 10,
      vatEnabled: true,
      vatPercent: 7,
    },
  });

  const serviceChargeEnabled = watch("serviceChargeEnabled");
  const vatEnabled = watch("vatEnabled");
  const themeColor = watch("themeColor");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          reset({
            name: data.name,
            phone: toEditableValue(data.phone),
            lineId: toEditableValue(data.lineId),
            address: toEditableValue(data.address),
            themeColor: data.themeColor || "#E85D04",
            serviceChargeEnabled: data.serviceChargeEnabled,
            serviceChargePercent: data.serviceChargePercent,
            vatEnabled: data.vatEnabled,
            vatPercent: data.vatPercent,
            receiptFooter: data.receiptFooter || "",
          });
          if (data.logoUrl) setCurrentLogoUrl(data.logoUrl);
        }
      })
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: SettingsForm) => {
    setIsSubmitting(true);
    try {
      // Upload logo if changed
      let logoUrl = currentLogoUrl;
      if (logoFile) {
        const formData = new FormData();
        formData.append("images", logoFile);
        formData.append("menuItemId", "settings-logo");
        const uploadRes = await fetch("/api/uploads/settings", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploaded = await uploadRes.json();
          logoUrl = uploaded.url;
          setCurrentLogoUrl(uploaded.url);
          setLogoFile(null);
          setLogoPreview("");
        } else {
          const uploadError = await uploadRes.json();
          toast.error(uploadError.error || "อัปโหลดโลโก้ไม่สำเร็จ");
          return;
        }
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, logoUrl }),
      });

      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "บันทึกไม่ได้");
        return;
      }

      toast.success("บันทึกการตั้งค่าสำเร็จ");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleDeleteLogo = async () => {
    if (!currentLogoUrl && !logoPreview) return;

    if (logoPreview && !currentLogoUrl) {
      setLogoFile(null);
      setLogoPreview("");
      return;
    }

    setIsDeletingLogo(true);
    try {
      const res = await fetch("/api/uploads/settings/logo", { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "ลบโลโก้ไม่สำเร็จ");
        return;
      }

      setLogoFile(null);
      setLogoPreview("");
      setCurrentLogoUrl("");
      toast.success("ลบโลโก้แล้ว");
    } catch {
      toast.error("ลบโลโก้ไม่สำเร็จ");
    } finally {
      setIsDeletingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="fade-in">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.65fr)]">
      {/* Basic Info */}
      <Card className="panel-surface">
        <CardHeader>
          <CardTitle className="text-base">ข้อมูลร้าน</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Logo */}
          <div className="space-y-2">
            <Label>โลโก้ร้าน</Label>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.5rem] border-2 border-dashed border-gray-200 bg-gray-50">
                {logoPreview || currentLogoUrl ? (
                  <img
                    src={logoPreview || currentLogoUrl}
                    alt="logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Upload className="h-7 w-7 text-gray-300" />
                )}
              </div>
              <div>
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <span><Upload className="w-4 h-4" /> เลือกรูปโลโก้</span>
                  </Button>
                </Label>
                {(logoPreview || currentLogoUrl) && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="ml-2"
                    onClick={handleDeleteLogo}
                    disabled={isDeletingLogo}
                  >
                    {isDeletingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    ลบโลโก้
                  </Button>
                )}
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP (สูงสุด 10MB)</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="name">ชื่อร้าน *</Label>
            <Input id="name" placeholder="ชื่อร้านอาหาร" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>เบอร์โทร</Label>
              <Input placeholder="02-xxx-xxxx" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label>LINE ID</Label>
              <Input placeholder="@lineid" {...register("lineId")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>ที่อยู่</Label>
            <Textarea
              placeholder="ที่อยู่ร้าน..."
              rows={3}
              {...register("address")}
            />
          </div>

          {/* Theme Color */}
          <div className="space-y-2">
            <Label>สีธีมหลัก</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setValue("themeColor", e.target.value)}
                className="w-12 h-10 rounded-lg border border-input cursor-pointer"
              />
              <Input
                value={themeColor}
                onChange={(e) => setValue("themeColor", e.target.value)}
                placeholder="#E85D04"
                className="font-mono"
              />
              <div
                className="w-10 h-10 rounded-lg border"
                style={{ backgroundColor: themeColor }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

        <div className="space-y-5">
          {/* Financial Settings */}
          <Card className="panel-surface">
            <CardHeader>
              <CardTitle className="text-base">การตั้งค่าทางการเงิน</CardTitle>
              <CardDescription>Service charge และ VAT จะถูกคำนวณอัตโนมัติในการออกบิล</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Service Charge */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-sm font-medium">Service Charge</Label>
                    <p className="text-xs text-muted-foreground">เปิดใช้งาน service charge สำหรับบิล</p>
                  </div>
                  <Switch
                    checked={serviceChargeEnabled}
                    onCheckedChange={(v) => setValue("serviceChargeEnabled", v)}
                  />
                </div>
                {serviceChargeEnabled && (
                  <div className="flex items-center gap-3">
                    <Label className="text-sm w-32">เปอร์เซ็นต์ (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      className="w-28"
                      {...register("serviceChargePercent")}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* VAT */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label className="text-sm font-medium">ภาษีมูลค่าเพิ่ม (VAT)</Label>
                    <p className="text-xs text-muted-foreground">เปิดใช้งาน VAT 7% สำหรับบิล</p>
                  </div>
                  <Switch
                    checked={vatEnabled}
                    onCheckedChange={(v) => setValue("vatEnabled", v)}
                  />
                </div>
                {vatEnabled && (
                  <div className="flex items-center gap-3">
                    <Label className="text-sm w-32">อัตรา VAT (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      className="w-28"
                      {...register("vatPercent")}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Receipt */}
          <Card className="panel-surface">
            <CardHeader>
              <CardTitle className="text-base">ใบเสร็จ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>ข้อความท้ายบิล</Label>
                <Textarea
                  placeholder="เช่น ขอบคุณที่ใช้บริการ..."
                  rows={5}
                  {...register("receiptFooter")}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-2">
          <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-2xl px-8 sm:w-auto">
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> กำลังบันทึก...</>
            ) : (
              <><Save className="w-4 h-4" /> บันทึกการตั้งค่า</>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
