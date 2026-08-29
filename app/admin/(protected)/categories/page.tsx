"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Loader2, GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

const categorySchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อหมวดหมู่"),
  isVisible: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0),
});

type CategoryForm = z.infer<typeof categorySchema>;

interface Category {
  id: string;
  name: string;
  isVisible: boolean;
  sortOrder: number;
  _count: { menuItems: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryForm>({ resolver: zodResolver(categorySchema) });

  const isVisible = watch("isVisible");

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(data);
    } catch {
      toast.error("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openCreate = () => {
    setSelectedCategory(null);
    reset({ name: "", isVisible: true, sortOrder: categories.length });
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setSelectedCategory(cat);
    reset({ name: cat.name, isVisible: cat.isVisible, sortOrder: cat.sortOrder });
    setDialogOpen(true);
  };

  const onSubmit = async (data: CategoryForm) => {
    setIsSubmitting(true);
    try {
      const url = selectedCategory
        ? `/api/categories/${selectedCategory.id}`
        : "/api/categories";
      const method = selectedCategory ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "เกิดข้อผิดพลาด");
        return;
      }

      toast.success(selectedCategory ? "แก้ไขหมวดหมู่สำเร็จ" : "เพิ่มหมวดหมู่สำเร็จ");
      setDialogOpen(false);
      fetchCategories();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/categories/${selectedCategory.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "ลบไม่ได้");
        return;
      }
      toast.success("ลบหมวดหมู่สำเร็จ");
      setDeleteDialogOpen(false);
      fetchCategories();
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleVisibility = async (cat: Category) => {
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !cat.isVisible }),
      });
      if (res.ok) {
        fetchCategories();
        toast.success(!cat.isVisible ? "เปิดแสดงแล้ว" : "ปิดแสดงแล้ว");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">หมวดหมู่อาหาร</h1>
          <p className="text-muted-foreground text-sm mt-1">จัดการหมวดหมู่สำหรับเมนูอาหาร</p>
        </div>
        <Button onClick={openCreate} id="add-category-btn">
          <Plus className="w-4 h-4" />
          เพิ่มหมวดหมู่
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">ยังไม่มีหมวดหมู่</p>
            <p className="text-sm mt-1">คลิก "เพิ่มหมวดหมู่" เพื่อเริ่มต้น</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {categories.map((cat) => (
            <Card key={cat.id} className="card-hover">
              <CardContent className="flex items-center gap-4 py-4">
                <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{cat.name}</span>
                    {!cat.isVisible && (
                      <Badge variant="secondary">ซ่อน</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {cat._count.menuItems} เมนู · ลำดับที่ {cat.sortOrder}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleVisibility(cat)}
                    className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-gray-100"
                    title={cat.isVisible ? "ซ่อน" : "แสดง"}
                  >
                    {cat.isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(cat)}>
                    <Pencil className="w-3 h-3" />
                    แก้ไข
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive hover:text-white border-destructive/30"
                    onClick={() => { setSelectedCategory(cat); setDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedCategory ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">ชื่อหมวดหมู่ *</Label>
              <Input id="cat-name" placeholder="เช่น อาหารจานหลัก" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-order">ลำดับการแสดง</Label>
              <Input id="cat-order" type="number" {...register("sortOrder")} />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="cat-visible"
                checked={isVisible}
                onCheckedChange={(v) => setValue("isVisible", v)}
              />
              <Label htmlFor="cat-visible">แสดงในหน้าเมนูลูกค้า</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {selectedCategory ? "บันทึก" : "เพิ่ม"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบหมวดหมู่</DialogTitle>
            <DialogDescription>
              คุณต้องการลบหมวดหมู่ <strong>{selectedCategory?.name}</strong> ใช่หรือไม่?
              {(selectedCategory?._count?.menuItems ?? 0) > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ มีเมนูอาหาร {selectedCategory?._count?.menuItems} รายการในหมวดหมู่นี้ ไม่สามารถลบได้
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>ยกเลิก</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || (selectedCategory?._count?.menuItems ?? 0) > 0}
            >
              {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
              ลบหมวดหมู่
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
