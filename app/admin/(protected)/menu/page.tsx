"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Image from "next/image";
import {
  Plus, Pencil, Trash2, Star, Eye, EyeOff, Upload, X, Loader2, Search,
} from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";

const menuSchema = z.object({
  name: z.string().min(1, "กรุณากรอกชื่อเมนู"),
  description: z.string().optional(),
  price: z.coerce.number().positive("ราคาต้องมากกว่า 0"),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().default(0),
});

type MenuForm = z.infer<typeof menuSchema>;

interface MenuItemImage {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  sortOrder: number;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  categoryId: string;
  isAvailable: boolean;
  isFeatured: boolean;
  sortOrder: number;
  images: MenuItemImage[];
  category: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState("all");
  const [search, setSearch] = useState("");

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } =
    useForm<MenuForm>({ resolver: zodResolver(menuSchema) });

  const isAvailable = watch("isAvailable");
  const isFeatured = watch("isFeatured");

  const fetchData = async () => {
    try {
      const [itemsRes, catsRes] = await Promise.all([
        fetch("/api/menu"),
        fetch("/api/categories"),
      ]);
      setItems(await itemsRes.json());
      setCategories(await catsRes.json());
    } catch { toast.error("โหลดข้อมูลไม่ได้"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setSelectedItem(null);
    setPendingImages([]);
    setPreviewUrls([]);
    setUploadingImages(false);
    reset({ name: "", description: "", price: 0, categoryId: "", isAvailable: true, isFeatured: false, sortOrder: 0 });
    setDialogOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setPendingImages([]);
    setPreviewUrls([]);
    setUploadingImages(false);
    reset({
      name: item.name,
      description: item.description || "",
      price: item.price,
      categoryId: item.categoryId,
      isAvailable: item.isAvailable,
      isFeatured: item.isFeatured,
      sortOrder: item.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 5);
    setPendingImages(files);
    setPreviewUrls(files.map((f) => URL.createObjectURL(f)));
  };

  const onSubmit = async (data: MenuForm) => {
    setIsSubmitting(true);
    try {
      const url = selectedItem ? `/api/menu/${selectedItem.id}` : "/api/menu";
      const method = selectedItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) { toast.error(result.error || "เกิดข้อผิดพลาด"); return; }

      // Upload images if any
      if (pendingImages.length > 0) {
        setUploadingImages(true);
        try {
          const formData = new FormData();
          formData.append("menuItemId", result.id);
          pendingImages.forEach((f) => formData.append("images", f));

          const uploadRes = await fetch("/api/menu/images", { method: "POST", body: formData });
          const uploadResult = await uploadRes.json();
          if (!uploadRes.ok) {
            toast.error(uploadResult.error || "อัปโหลดรูปไม่สำเร็จ");
            return;
          }
        } finally {
          setUploadingImages(false);
        }
      }

      toast.success(selectedItem ? "แก้ไขเมนูสำเร็จ" : "เพิ่มเมนูสำเร็จ");
      setDialogOpen(false);
      setPendingImages([]);
      setPreviewUrls([]);
      await fetchData();
    } catch { toast.error("เกิดข้อผิดพลาด"); }
    finally {
      setUploadingImages(false);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    const res = await fetch(`/api/menu/${selectedItem.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("ลบเมนูสำเร็จ");
      setDeleteDialogOpen(false);
      fetchData();
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!selectedItem) return;
    setDeletingImageId(imageId);
    try {
      const res = await fetch(`/api/menu/images/${imageId}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.error || "ลบรูปไม่สำเร็จ");
        return;
      }

      const nextItem = {
        ...selectedItem,
        images: selectedItem.images.filter((image) => image.id !== imageId),
      };
      setSelectedItem(nextItem);
      setItems((current) => current.map((item) => (item.id === nextItem.id ? nextItem : item)));
      toast.success("ลบรูปแล้ว");
      fetchData();
    } catch {
      toast.error("ลบรูปไม่สำเร็จ");
    } finally {
      setDeletingImageId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchCat = filterCategory === "all" || item.categoryId === filterCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">เมนูอาหาร</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} รายการ</p>
        </div>
        <Button onClick={openCreate} id="add-menu-btn">
          <Plus className="w-4 h-4" /> เพิ่มเมนู
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ค้นหาเมนู..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="ทุกหมวดหมู่" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="card-hover overflow-hidden">
              <div className="relative h-40 bg-gray-100">
                {item.images[0] ? (
                  <Image
                    src={item.images[0].thumbnailUrl || item.images[0].url}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🍽</div>
                )}
                {item.isFeatured && (
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-amber-500 text-white border-0 text-xs">
                      <Star className="w-3 h-3 mr-1" /> แนะนำ
                    </Badge>
                  </div>
                )}
                {!item.isAvailable && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Badge variant="secondary" className="text-sm">หมดชั่วคราว</Badge>
                  </div>
                )}
                {item.images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                    +{item.images.length - 1}
                  </div>
                )}
              </div>
              <CardContent className="pt-3 pb-3">
                <p className="font-semibold text-sm truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.category.name}</p>
                <p className="text-primary font-bold mt-1">{formatCurrency(item.price)}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => openEdit(item)}>
                    <Pencil className="w-3 h-3" /> แก้ไข
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive hover:text-white"
                    onClick={() => { setSelectedItem(item); setDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              ไม่พบเมนู
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedItem ? "แก้ไขเมนู" : "เพิ่มเมนู"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>ชื่อเมนู *</Label>
                <Input placeholder="ชื่อเมนูอาหาร" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>ราคา (บาท) *</Label>
                <Input type="number" step="0.5" {...register("price")} />
                {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>หมวดหมู่ *</Label>
                <Select
                  value={watch("categoryId")}
                  onValueChange={(v) => setValue("categoryId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกหมวดหมู่" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
              </div>
              <div className="col-span-2 space-y-2">
                <Label>รายละเอียด</Label>
                <Textarea placeholder="รายละเอียดเมนู..." rows={2} {...register("description")} />
              </div>
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>รูปภาพ (เพิ่มได้สูงสุด 5 รูป)</Label>

              {/* Existing images */}
              {selectedItem?.images && selectedItem.images.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {selectedItem.images.map((img) => (
                    <div key={img.id} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                      <Image src={img.thumbnailUrl || img.url} alt="" fill className="object-cover" />
                      <button
                        type="button"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow hover:bg-red-700 disabled:opacity-60"
                        onClick={() => handleDeleteImage(img.id)}
                        disabled={deletingImageId === img.id}
                        aria-label="ลบรูปเมนู"
                      >
                        {deletingImageId === img.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* New images */}
              {previewUrls.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                  <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">คลิกเพื่อเลือกรูปภาพ (เพิ่มใหม่)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">รองรับ JPG, PNG, WebP</p>
                </div>
              </label>
            </div>

            {/* Toggles */}
            <div className="flex gap-6">
              <div className="flex items-center gap-3">
                <Switch checked={isAvailable} onCheckedChange={(v) => setValue("isAvailable", v)} />
                <Label>พร้อมขาย</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={isFeatured} onCheckedChange={(v) => setValue("isFeatured", v)} />
                <Label>เมนูแนะนำ ⭐</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>ยกเลิก</Button>
              <Button type="submit" disabled={isSubmitting || uploadingImages}>
                {(isSubmitting || uploadingImages) && <Loader2 className="w-4 h-4 animate-spin" />}
                {uploadingImages ? "กำลังอัปโหลดรูป..." : selectedItem ? "บันทึก" : "เพิ่มเมนู"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบเมนู</DialogTitle>
            <DialogDescription>
              ต้องการลบ <strong>{selectedItem?.name}</strong>? การลบไม่สามารถย้อนกลับได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleDelete}>ลบเมนู</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
