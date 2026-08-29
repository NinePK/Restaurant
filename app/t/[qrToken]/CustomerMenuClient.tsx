"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Search, ShoppingCart, Plus, Minus, X, Check,
  ChevronLeft, Loader2, Tag, Star, Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

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
  images: MenuItemImage[];
  category: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
  isVisible: boolean;
  sortOrder: number;
}

interface Promotion {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

interface RestaurantSetting {
  name: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  themeColor: string;
}

interface DiningTable {
  id: string;
  name: string;
  qrToken: string;
}

interface CartItem {
  menuItemId: string;
  menuItemName: string;
  price: number;
  quantity: number;
  note: string;
  image?: string;
}

interface Props {
  table: DiningTable;
  settings: RestaurantSetting | null;
  categories: Category[];
  menuItems: MenuItem[];
  promotions: Promotion[];
}

export default function CustomerMenuClient({
  table, settings, categories, menuItems, promotions,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [itemNote, setItemNote] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const themeColor = settings?.themeColor || "#E85D04";

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = selectedCategory === "all" || item.categoryId === selectedCategory;
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategory, search]);

  const featuredItems = useMemo(() => menuItems.filter((i) => i.isFeatured && i.isAvailable), [menuItems]);

  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, MenuItem[]> = {};
    for (const cat of categories) {
      grouped[cat.id] = filteredItems.filter((i) => i.categoryId === cat.id);
    }
    return grouped;
  }, [categories, filteredItems]);

  const openItemDetail = (item: MenuItem) => {
    if (!item.isAvailable) return;
    setSelectedItem(item);
    setItemNote("");
    setItemQty(1);
  };

  const addToCart = () => {
    if (!selectedItem) return;
    const existing = cart.find(
      (c) => c.menuItemId === selectedItem.id && c.note === itemNote
    );
    if (existing) {
      setCart(cart.map((c) =>
        c.menuItemId === selectedItem.id && c.note === itemNote
          ? { ...c, quantity: c.quantity + itemQty }
          : c
      ));
    } else {
      setCart([...cart, {
        menuItemId: selectedItem.id,
        menuItemName: selectedItem.name,
        price: selectedItem.price,
        quantity: itemQty,
        note: itemNote,
        image: selectedItem.images[0]?.thumbnailUrl || selectedItem.images[0]?.url,
      }]);
    }
    setSelectedItem(null);
    toast.success(`เพิ่ม ${selectedItem.name} ลงตะกร้าแล้ว`);
  };

  const updateCartQty = (menuItemId: string, note: string, delta: number) => {
    setCart(prev =>
      prev.map(item =>
        item.menuItemId === menuItemId && item.note === note
          ? { ...item, quantity: Math.max(0, item.quantity + delta) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const submitOrder = async () => {
    if (!cart.length) return;
    setIsOrdering(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: table.id,
          items: cart.map(({ image: _img, ...item }) => item),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "เกิดข้อผิดพลาด");
        return;
      }
      setCart([]);
      setCartOpen(false);
      setOrderSent(true);
    } catch {
      toast.error("ไม่สามารถส่งออเดอร์ได้");
    } finally {
      setIsOrdering(false);
    }
  };

  if (orderSent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-green-50 to-white">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ส่งออเดอร์สำเร็จ! 🎉</h1>
        <p className="text-muted-foreground text-center mb-2">ออเดอร์ของคุณถูกส่งไปยังครัวแล้ว</p>
        <p className="text-sm text-muted-foreground mb-8">{table.name}</p>
        <Button onClick={() => setOrderSent(false)} className="w-full max-w-xs">
          สั่งเพิ่ม
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="relative" style={{ backgroundColor: themeColor }}>
        {settings?.coverImageUrl && (
          <div className="absolute inset-0">
            <Image
              src={settings.coverImageUrl}
              alt="cover"
              fill
              className="object-cover opacity-30"
            />
          </div>
        )}
        <div className="relative px-4 pt-6 pb-8 text-white">
          {settings?.logoUrl && (
            <div className="w-16 h-16 rounded-xl overflow-hidden mb-3 border-2 border-white/30">
              <Image src={settings.logoUrl} alt="logo" width={64} height={64} className="object-cover" />
            </div>
          )}
          <h1 className="text-xl font-bold">{settings?.name || "ร้านอาหาร"}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge className="bg-white/20 text-white border-0 text-xs">{table.name}</Badge>
          </div>
        </div>
      </div>

      {/* Promotions */}
      {promotions.length > 0 && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">โปรโมชัน</span>
          </div>
          <div className="space-y-2">
            {promotions.map((promo) => (
              <div key={promo.id} className="bg-white rounded-lg p-3 shadow-sm border border-amber-100">
                <p className="font-medium text-sm text-amber-900">{promo.name}</p>
                {promo.description && (
                  <p className="text-xs text-amber-700 mt-0.5">{promo.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="sticky top-0 z-30 bg-white border-b px-4 py-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ค้นหาเมนู..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-gray-50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === "all"
                ? "text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
            style={selectedCategory === "all" ? { backgroundColor: themeColor } : {}}
          >
            ทั้งหมด
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={selectedCategory === cat.id ? { backgroundColor: themeColor } : {}}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Items */}
      {selectedCategory === "all" && !search && featuredItems.length > 0 && (
        <div className="px-4 pt-5 pb-2">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="font-semibold text-gray-800">เมนูแนะนำ</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {featuredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => openItemDetail(item)}
                className="flex-shrink-0 w-36 bg-white rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="w-full h-24 rounded-t-xl overflow-hidden bg-gray-100 relative">
                  {item.images[0] ? (
                    <Image
                      src={item.images[0].thumbnailUrl || item.images[0].url}
                      alt={item.name}
                      fill
                      className="object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">🍽</div>
                  )}
                  <div className="absolute top-1 right-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-800 line-clamp-2">{item.name}</p>
                  <p className="text-xs font-bold mt-1" style={{ color: themeColor }}>
                    {formatCurrency(item.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu by Category */}
      <div className="px-4 py-4 pb-32 space-y-6">
        {categories.map((cat) => {
          const items = itemsByCategory[cat.id] || [];
          if (items.length === 0) return null;
          return (
            <div
              key={cat.id}
              ref={(el) => { categoryRefs.current[cat.id] = el; }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-bold text-gray-800">{cat.name}</h2>
                <span className="text-xs text-muted-foreground">({items.length})</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => openItemDetail(item)}
                    className={`flex gap-3 bg-white rounded-xl shadow-sm border p-3 ${
                      item.isAvailable
                        ? "cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                        : "opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative">
                      {item.images[0] ? (
                        <Image
                          src={item.images[0].thumbnailUrl || item.images[0].url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">🍽</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                        {!item.isAvailable && (
                          <Badge variant="secondary" className="text-xs flex-shrink-0">หมดชั่วคราว</Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                      <p className="text-sm font-bold mt-2" style={{ color: themeColor }}>
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-3">🔍</p>
            <p>ไม่พบเมนูที่ค้นหา</p>
          </div>
        )}
      </div>

      {/* Cart Button (sticky) */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-sm px-4">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-white shadow-2xl font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: themeColor }}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="bg-white/30 rounded-full px-2 py-0.5 text-xs">{cartCount}</span>
            </div>
            <span>ดูตะกร้า</span>
            <span>{formatCurrency(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={() => setSelectedItem(null)}>
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedItem.images[0] && (
              <div className="w-full h-48 rounded-xl overflow-hidden mb-4 relative">
                <Image
                  src={selectedItem.images[0].url}
                  alt={selectedItem.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <h2 className="text-xl font-bold text-gray-900">{selectedItem.name}</h2>
            {selectedItem.description && (
              <p className="text-sm text-muted-foreground mt-1">{selectedItem.description}</p>
            )}
            <p className="text-lg font-bold mt-2" style={{ color: themeColor }}>
              {formatCurrency(selectedItem.price)}
            </p>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">หมายเหตุ (เช่น ไม่เผ็ด, ไม่ใส่ผัก)</label>
              <input
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder="เพิ่มหมายเหตุ..."
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-center justify-between mt-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setItemQty(Math.max(1, itemQty - 1))}
                  className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-gray-100"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold text-lg">{itemQty}</span>
                <button
                  onClick={() => setItemQty(itemQty + 1)}
                  className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-gray-100"
                  style={{ borderColor: themeColor }}
                >
                  <Plus className="w-4 h-4" style={{ color: themeColor }} />
                </button>
              </div>
              <Button
                onClick={addToCart}
                className="px-6 py-5 text-base font-semibold rounded-xl"
                style={{ backgroundColor: themeColor }}
              >
                เพิ่มลงตะกร้า — {formatCurrency(selectedItem.price * itemQty)}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={() => setCartOpen(false)}>
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl p-6 pb-10 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">ตะกร้าของคุณ</h2>
              <button onClick={() => setCartOpen(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {cart.map((item) => (
                <div key={`${item.menuItemId}-${item.note}`} className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.menuItemName}</p>
                    {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
                    <p className="text-sm font-bold mt-0.5" style={{ color: themeColor }}>
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQty(item.menuItemId, item.note, -1)}
                      className="w-7 h-7 rounded-full border flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQty(item.menuItemId, item.note, 1)}
                      className="w-7 h-7 rounded-full border flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold w-20 text-right">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold">
                <span>รวมทั้งหมด</span>
                <span style={{ color: themeColor }}>{formatCurrency(cartTotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">* ราคายังไม่รวม VAT และ service charge</p>
            </div>

            <Button
              onClick={submitOrder}
              disabled={isOrdering}
              className="w-full h-13 text-base font-bold rounded-xl py-4"
              style={{ backgroundColor: themeColor }}
            >
              {isOrdering ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> กำลังส่งออเดอร์...</>
              ) : (
                `ยืนยันออเดอร์ — ${table.name}`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
