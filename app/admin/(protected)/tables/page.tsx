"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Image from "next/image";
import {
  Plus, QrCode, Download, RefreshCw, Pencil, Trash2, ToggleLeft,
  Loader2, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

const tableSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อโต๊ะ"),
  isActive: z.boolean().default(true),
});

type TableForm = z.infer<typeof tableSchema>;

interface DiningTable {
  id: string;
  name: string;
  qrToken: string;
  isActive: boolean;
  _count: { orders: number };
}

export default function TablesPage() {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loadingQr, setLoadingQr] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TableForm>({
    resolver: zodResolver(tableSchema),
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const fetchTables = async () => {
    try {
      const res = await fetch("/api/tables");
      setTables(await res.json());
    } catch {
      toast.error("โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTables(); }, []);

  const onSubmit = async (data: TableForm) => {
    setIsSubmitting(true);
    try {
      const url = selectedTable ? `/api/tables/${selectedTable.id}` : "/api/tables";
      const method = selectedTable ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) { toast.error(result.error); return; }
      toast.success(selectedTable ? "แก้ไขโต๊ะสำเร็จ" : "เพิ่มโต๊ะสำเร็จ");
      setDialogOpen(false);
      fetchTables();
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    finally { setIsSubmitting(false); }
  };

  const resetToken = async (table: DiningTable) => {
    if (!confirm(`Reset QR Code ของ ${table.name}? QR Code เดิมจะใช้งานไม่ได้`)) return;
    const res = await fetch(`/api/tables/${table.id}`, { method: "PATCH" });
    if (res.ok) {
      toast.success("Reset QR Code สำเร็จ");
      fetchTables();
    }
  };

  const showQR = async (table: DiningTable) => {
    setSelectedTable(table);
    setQrDialogOpen(true);
    setLoadingQr(true);
    try {
      const QRCode = (await import("qrcode")).default;
      const url = `${baseUrl}/t/${table.qrToken}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 400, margin: 2,
        color: { dark: "#1a1a1a", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });
      setQrDataUrl(dataUrl);
    } catch { toast.error("สร้าง QR ไม่ได้"); }
    finally { setLoadingQr(false); }
  };

  const downloadQR = () => {
    if (!qrDataUrl || !selectedTable) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR-${selectedTable.name}.png`;
    a.click();
  };

  const openCreate = () => {
    setSelectedTable(null);
    reset({ name: "", isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (table: DiningTable) => {
    setSelectedTable(table);
    reset({ name: table.name, isActive: table.isActive });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">โต๊ะ & QR Code</h1>
          <p className="text-muted-foreground text-sm mt-1">จัดการโต๊ะและสร้าง QR Code สำหรับลูกค้า</p>
        </div>
        <Button onClick={openCreate} id="add-table-btn">
          <Plus className="w-4 h-4" /> เพิ่มโต๊ะ
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <Card key={table.id} className="card-hover">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-lg">{table.name}</p>
                    <Badge variant={table.isActive ? "success" : "secondary"} className="mt-1 text-xs">
                      {table.isActive ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> เปิดใช้</>
                      ) : (
                        <><XCircle className="w-3 h-3 mr-1" /> ปิด</>
                      )}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(table)}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setSelectedTable(table); setDeleteDialogOpen(true); }}
                      className="p-1.5 rounded-md hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-4 font-mono truncate">
                  Token: {table.qrToken.slice(0, 8)}...
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => showQR(table)}>
                    <QrCode className="w-3 h-3" /> QR Code
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-amber-600 border-amber-200 hover:bg-amber-50"
                    onClick={() => resetToken(table)}
                  >
                    <RefreshCw className="w-3 h-3" /> Reset QR
                  </Button>
                </div>

                <a
                  href={`/t/${table.qrToken}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 text-center text-xs text-primary hover:underline"
                >
                  เปิดหน้าเมนูลูกค้า →
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTable ? "แก้ไขโต๊ะ" : "เพิ่มโต๊ะ"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>ชื่อโต๊ะ *</Label>
              <Input placeholder="เช่น โต๊ะ 1, A1, VIP1" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {selectedTable ? "บันทึก" : "เพิ่ม"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code — {selectedTable?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {loadingQr ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 rounded-lg" />
            ) : null}
            <p className="text-xs text-center text-muted-foreground">
              {baseUrl}/t/{selectedTable?.qrToken}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>ปิด</Button>
            <Button onClick={downloadQR} disabled={!qrDataUrl}>
              <Download className="w-4 h-4" /> ดาวน์โหลด PNG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบโต๊ะ</DialogTitle>
            <DialogDescription>
              ต้องการลบ <strong>{selectedTable?.name}</strong>? ข้อมูลที่เกี่ยวข้องอาจหายไปด้วย
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>ยกเลิก</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!selectedTable) return;
                const res = await fetch(`/api/tables/${selectedTable.id}`, { method: "DELETE" });
                if (res.ok) { toast.success("ลบโต๊ะสำเร็จ"); fetchTables(); }
                setDeleteDialogOpen(false);
              }}
            >
              ลบโต๊ะ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
