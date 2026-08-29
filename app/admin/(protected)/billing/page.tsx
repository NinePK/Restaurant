"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatCurrency, getPaymentMethodLabel } from "@/lib/utils";
import {
  calculateManualDiscountAmount,
  getPromotionDiscountLabel,
  getPromotionEligibilityReason,
  resolveAppliedPromotions,
  type BillingPromotion,
} from "@/lib/promotion-utils";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, Printer, Receipt, Store, TicketPercent, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import ReceiptPreview, {
  printReceiptElement,
  type ReceiptBill,
} from "@/components/admin/ReceiptPreview";

interface OrderItem {
  id: string;
  menuItemName: string;
  quantity: number;
  price: number;
  note: string | null;
}

interface Order {
  id: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

interface Table {
  id: string;
  name: string;
  qrToken: string;
}

interface Settings {
  serviceChargeEnabled: boolean;
  serviceChargePercent: number;
  vatEnabled: boolean;
  vatPercent: number;
  receiptFooter: string | null;
}

type Promotion = BillingPromotion & {
  description: string | null;
};

const paymentMethods = ["CASH", "BANK_TRANSFER", "PROMPTPAY", "CARD"] as const;

export default function BillingPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedTableId, setSelectedTableId] = useState("");
  const [manualDiscountInput, setManualDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]>("CASH");
  const [selectedPromotionIds, setSelectedPromotionIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [receiptBill, setReceiptBill] = useState<ReceiptBill | null>(null);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/tables").then((response) => response.json()),
      fetch("/api/settings").then((response) => response.json()),
      fetch("/api/promotions").then((response) => response.json()),
    ]).then(([tableData, settingsData, promotionData]) => {
      setTables(tableData);
      setSettings(settingsData);
      setPromotions(promotionData);
    });
  }, []);

  const loadOrders = async (tableId: string) => {
    if (!tableId) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders?tableId=${tableId}&status=PENDING,ACCEPTED,PREPARING,SERVED&unbilledOnly=true`);
      const data = await res.json();
      setOrders(data.filter((order: Order) => ["PENDING", "ACCEPTED", "PREPARING", "SERVED"].includes(order.status)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTableSelect = (tableId: string) => {
    setSelectedTableId(tableId);
    setOrders([]);
    setManualDiscountInput("");
    setSelectedPromotionIds([]);
    setSuccess(false);
    loadOrders(tableId);
  };

  const allItems = useMemo(() => orders.flatMap((order) => order.items), [orders]);
  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;
  const itemCount = allItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = allItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const manualDiscountValue = manualDiscountInput === "" ? 0 : Number(manualDiscountInput);

  const promotionResolution = useMemo(
    () => resolveAppliedPromotions(promotions, selectedPromotionIds, subtotal),
    [promotions, selectedPromotionIds, subtotal]
  );

  const autoAppliedIds = new Set(promotionResolution.autoAppliedIds);
  const appliedPromotionIds = new Set(
    promotionResolution.appliedPromotions.map((promotion) => promotion.id)
  );
  const appliedPromotionDiscount = promotionResolution.appliedPromotions.reduce(
    (sum, promotion) => sum + promotion.discountAmount,
    0
  );

  const manualDiscountAmount = calculateManualDiscountAmount(
    subtotal,
    manualDiscountValue,
    discountType
  );
  const totalDiscountAmount = Math.min(subtotal, manualDiscountAmount + appliedPromotionDiscount);
  const afterDiscount = Math.max(0, subtotal - totalDiscountAmount);
  const serviceCharge = settings?.serviceChargeEnabled
    ? afterDiscount * ((settings.serviceChargePercent || 10) / 100)
    : 0;
  const afterService = afterDiscount + serviceCharge;
  const vat = settings?.vatEnabled ? afterService * ((settings.vatPercent || 7) / 100) : 0;
  const grandTotal = afterService + vat;

  const selectedNonStackablePromotion = promotionResolution.appliedPromotions.find(
    (promotion) => !promotion.canStack
  );

  const handleDiscountInputChange = (value: string) => {
    if (value === "") {
      setManualDiscountInput("");
      return;
    }

    if (!/^\d*\.?\d{0,2}$/.test(value)) return;

    setManualDiscountInput(value.replace(/^0+(?=\d)/, ""));
  };

  const togglePromotion = (promotion: Promotion) => {
    const baseReason =
      !selectedTableId || orders.length === 0
        ? "เลือกโต๊ะและโหลดรายการก่อน"
        : promotionResolution.eligibilityById.get(promotion.id) ||
          getPromotionEligibilityReason(promotion, subtotal);

    if (baseReason) return;
    if (autoAppliedIds.has(promotion.id)) return;

    const isSelected = selectedPromotionIds.includes(promotion.id);
    if (isSelected) {
      setSelectedPromotionIds((prev) => prev.filter((id) => id !== promotion.id));
      return;
    }

    if (selectedNonStackablePromotion && selectedNonStackablePromotion.id !== promotion.id) {
      return;
    }

    if (!promotion.canStack) {
      setSelectedPromotionIds([promotion.id]);
      return;
    }

    setSelectedPromotionIds((prev) => {
      const next = prev.filter((id) => {
        const current = promotions.find((promotionItem) => promotionItem.id === id);
        return current?.canStack !== false;
      });
      return [...next, promotion.id];
    });
  };

  const createBill = async () => {
    if (!selectedTableId || orders.length === 0) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableId: selectedTableId,
          orderIds: orders.map((order) => order.id),
          manualDiscountValue,
          manualDiscountType: discountType,
          promotionIds: promotionResolution.appliedPromotions.map((promotion) => promotion.id),
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "ออกบิลไม่สำเร็จ");
        return;
      }

      toast.success("ออกบิลสำเร็จและปิดโต๊ะแล้ว");
      setReceiptBill(data);
      setReceiptDialogOpen(true);
      setSuccess(true);
      setOrders([]);
      setSelectedTableId("");
      setManualDiscountInput("");
      setSelectedPromotionIds([]);
    } catch {
      toast.error("เกิดข้อผิดพลาดในการออกบิล");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {success && (
        <div className="panel-surface flex items-center gap-3 px-5 py-4 text-[hsl(var(--admin-ink))]">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">ออกบิลสำเร็จ</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.85fr]">
        <div className="space-y-6">
          <Card className="panel-surface">
            <CardHeader className="flex flex-row items-end justify-between gap-4 pb-3">
              <div>
                <p className="section-eyebrow">ออกบิล</p>
                <CardTitle className="mt-2 text-xl">เลือกโต๊ะ</CardTitle>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <div className="topbar-pill">{selectedTable ? selectedTable.name : "ยังไม่ได้เลือกโต๊ะ"}</div>
                <div className="topbar-pill">{itemCount} ชิ้น</div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {tables.map((table) => {
                  const isActive = selectedTableId === table.id;

                  return (
                    <button
                      key={table.id}
                      onClick={() => handleTableSelect(table.id)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                        isActive
                          ? "border-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent))] text-white"
                          : "border-[hsl(var(--admin-line))] bg-white text-[hsl(var(--admin-ink))] hover:border-[hsl(var(--admin-accent))]"
                      }`}
                    >
                      {table.name}
                    </button>
                  );
                })}
              </div>

              <div className="panel-muted p-4">
                <Label className="text-sm font-medium text-[hsl(var(--admin-ink))]">เลือกโต๊ะ</Label>
                <Select onValueChange={handleTableSelect} value={selectedTableId}>
                  <SelectTrigger id="table-select" className="mt-3 rounded-2xl border-[hsl(var(--admin-line))] bg-white">
                    <SelectValue placeholder="เลือกโต๊ะ..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.map((table) => (
                      <SelectItem key={table.id} value={table.id}>
                        {table.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="panel-surface">
            <CardHeader className="flex flex-row items-end justify-between gap-4 pb-3">
              <div>
                <p className="section-eyebrow">รายการ</p>
                <CardTitle className="mt-2 text-xl">
                  {selectedTable ? `รายการของ ${selectedTable.name}` : "ยังไม่มีรายการ"}
                </CardTitle>
              </div>
              {selectedTable && (
                <div className="topbar-pill">
                  <Store className="h-3.5 w-3.5 text-[hsl(var(--admin-accent))]" />
                  {orders.length} ออเดอร์
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!selectedTableId ? (
                <div className="panel-muted flex min-h-56 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  เลือกโต๊ะก่อน
                </div>
              ) : isLoading ? (
                <div className="panel-muted flex min-h-56 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--admin-accent))]" />
                </div>
              ) : orders.length === 0 ? (
                <div className="panel-muted flex min-h-56 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                  ไม่มีออเดอร์
                </div>
              ) : (
                <div className="space-y-3">
                  {allItems.map((item, index) => (
                    <div key={`${item.id}-${index}`} className="panel-muted flex items-start justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[hsl(var(--admin-ink))]">
                          {item.menuItemName}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{item.quantity} ชิ้น</span>
                          {item.note && <span>• {item.note}</span>}
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-[hsl(var(--admin-ink))]">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="xl:sticky xl:top-28 xl:h-fit">
          <Card className="panel-surface overflow-hidden">
            <CardHeader className="pb-3">
              <p className="section-eyebrow">ชำระเงิน</p>
              <CardTitle className="mt-2 text-xl">สรุปยอดและชำระเงิน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="panel-muted p-4">
                <Label className="text-sm font-medium text-[hsl(var(--admin-ink))]">ส่วนลดหน้าร้าน</Label>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setDiscountType("flat")}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      discountType === "flat"
                        ? "bg-[hsl(var(--admin-ink))] text-white"
                        : "bg-white text-[hsl(var(--admin-ink))]"
                    }`}
                  >
                    บาท
                  </button>
                  <button
                    onClick={() => setDiscountType("percent")}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      discountType === "percent"
                        ? "bg-[hsl(var(--admin-ink))] text-white"
                        : "bg-white text-[hsl(var(--admin-ink))]"
                    }`}
                  >
                    %
                  </button>
                </div>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={manualDiscountInput}
                  onChange={(e) => handleDiscountInputChange(e.target.value)}
                  placeholder="0"
                  className="mt-3 rounded-2xl border-[hsl(var(--admin-line))] bg-white"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-sm font-medium text-[hsl(var(--admin-ink))]">โปรโมชันจากระบบ</Label>
                  {promotionResolution.appliedPromotions.length > 0 && (
                    <div className="topbar-pill">
                      <TicketPercent className="h-3.5 w-3.5 text-[hsl(var(--admin-accent))]" />
                      ใช้อยู่ {promotionResolution.appliedPromotions.length} โปร
                    </div>
                  )}
                </div>

                {!selectedTableId || orders.length === 0 ? (
                  <div className="panel-muted p-4 text-sm text-muted-foreground">
                    เลือกโต๊ะก่อน
                  </div>
                ) : promotions.length === 0 ? (
                  <div className="panel-muted p-4 text-sm text-muted-foreground">
                    ยังไม่มีโปรโมชันที่ตั้งค่าไว้
                  </div>
                ) : (
                  <div className="space-y-2">
                    {promotions.map((promotion) => {
                      const eligibilityReason =
                        promotionResolution.eligibilityById.get(promotion.id) ||
                        getPromotionEligibilityReason(promotion, subtotal);
                      const isApplied = appliedPromotionIds.has(promotion.id);
                      const isAutoApplied = autoAppliedIds.has(promotion.id);
                      const blockedBySelection =
                        !eligibilityReason &&
                        selectedNonStackablePromotion &&
                        selectedNonStackablePromotion.id !== promotion.id
                          ? `${selectedNonStackablePromotion.name} ใช้ร่วมกับโปรอื่นไม่ได้`
                          : null;
                      const isDisabled = Boolean(eligibilityReason || blockedBySelection);

                      return (
                        <button
                          key={promotion.id}
                          type="button"
                          onClick={() => togglePromotion(promotion)}
                          disabled={isDisabled}
                          className={`w-full rounded-[1.1rem] border px-4 py-3 text-left transition ${
                            isApplied
                              ? "border-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent-soft))]"
                              : "border-[hsl(var(--admin-line))] bg-white"
                          } ${isDisabled ? "cursor-not-allowed opacity-60" : "hover:border-[hsl(var(--admin-accent))]"}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-[hsl(var(--admin-ink))]">
                                  {promotion.name}
                                </span>
                                <Badge variant={isApplied ? "success" : "secondary"}>
                                  {getPromotionDiscountLabel(promotion)}
                                </Badge>
                                {promotion.autoApply && <Badge variant="orange">บังคับใช้</Badge>}
                                {promotion.canStack && <Badge variant="info">ซ้อนโปรได้</Badge>}
                              </div>
                              {promotion.description && (
                                <p className="mt-1 text-xs text-muted-foreground">{promotion.description}</p>
                              )}
                              <p className="mt-2 text-xs text-muted-foreground">
                                {promotion.minOrderAmount
                                  ? `ยอดขั้นต่ำ ${promotion.minOrderAmount.toLocaleString("th-TH")} บาท`
                                  : "ไม่มีขั้นต่ำ"}
                              </p>
                              {(eligibilityReason || blockedBySelection) && (
                                <p className="mt-2 text-xs font-medium text-amber-700">
                                  {eligibilityReason || blockedBySelection}
                                </p>
                              )}
                              {isAutoApplied && !eligibilityReason && (
                                <p className="mt-2 text-xs font-medium text-emerald-700">
                                  ใช้อัตโนมัติ
                                </p>
                              )}
                            </div>
                            <div className="shrink-0">
                              {isApplied ? (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--admin-accent))] text-white">
                                  <Check className="h-4 w-4" />
                                </span>
                              ) : (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[hsl(var(--admin-line))] bg-white text-muted-foreground">
                                  <TicketPercent className="h-4 w-4" />
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-[hsl(var(--admin-ink))]">วิธีชำระเงิน</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {paymentMethods.map((method) => {
                    const isActive = paymentMethod === method;
                    return (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-[hsl(var(--admin-accent))] bg-[hsl(var(--admin-accent-soft))] text-[hsl(var(--admin-ink))]"
                            : "border-[hsl(var(--admin-line))] bg-white text-[hsl(var(--admin-ink))]"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Wallet className="h-4 w-4" />
                          {getPaymentMethodLabel(method)}
                        </span>
                        {isActive && <Check className="h-4 w-4 text-[hsl(var(--admin-accent))]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ยอดรวม</span>
                  <span className="font-medium text-[hsl(var(--admin-ink))]">{formatCurrency(subtotal)}</span>
                </div>
                {manualDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>ส่วนลดหน้าร้าน</span>
                    <span>-{formatCurrency(manualDiscountAmount)}</span>
                  </div>
                )}
                {promotionResolution.appliedPromotions.map((promotion) => (
                  <div key={promotion.id} className="flex justify-between text-emerald-700">
                    <span>{promotion.name}</span>
                    <span>-{formatCurrency(promotion.discountAmount)}</span>
                  </div>
                ))}
                {settings?.serviceChargeEnabled && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Service Charge ({settings.serviceChargePercent}%)
                    </span>
                    <span className="font-medium text-[hsl(var(--admin-ink))]">{formatCurrency(serviceCharge)}</span>
                  </div>
                )}
                {settings?.vatEnabled && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT ({settings.vatPercent}%)</span>
                    <span className="font-medium text-[hsl(var(--admin-ink))]">{formatCurrency(vat)}</span>
                  </div>
                )}
              </div>

              <div className="rounded-[1.4rem] bg-[hsl(var(--admin-ink))] px-5 py-5 text-white">
                <p className="text-xs uppercase tracking-[0.18em] text-white/60">ยอดสุทธิ</p>
                <p className="mt-2 text-4xl font-semibold tracking-[-0.05em]">
                  {formatCurrency(grandTotal)}
                </p>
                {totalDiscountAmount > 0 && (
                  <p className="mt-2 text-sm text-white/70">
                    ส่วนลดรวม {formatCurrency(totalDiscountAmount)}
                  </p>
                )}
              </div>

              <Button
                className="h-12 w-full rounded-full text-base font-semibold"
                onClick={createBill}
                disabled={isCreating || orders.length === 0 || !selectedTableId}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    กำลังออกบิล...
                  </>
                ) : (
                  <>
                    <Receipt className="h-5 w-5" />
                    ออกบิลและปิดโต๊ะ
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-h-[92vh] max-w-[460px] overflow-y-auto rounded-[1.75rem] bg-[#f6efe4] p-0">
          <DialogHeader className="border-b border-[#dfd0bd] bg-white px-5 py-4">
            <div className="flex items-center justify-between gap-3 pr-8">
              <DialogTitle>ตัวอย่างใบเสร็จ</DialogTitle>
              <Button
                type="button"
                onClick={() => printReceiptElement("billing-receipt-preview")}
                className="rounded-full bg-[#17211f] text-white hover:bg-[#263733]"
                disabled={!receiptBill}
              >
                <Printer className="h-4 w-4" />
                พิมพ์ใบเสร็จ
              </Button>
            </div>
          </DialogHeader>

          <div className="p-5">
            {receiptBill && (
              <div id="billing-receipt-preview">
                <ReceiptPreview bill={receiptBill} />
              </div>
            )}
            <p className="mt-4 text-center text-xs text-[#66736c]">
              ถ้าใช้เครื่องพิมพ์ใบเสร็จจริง ให้เลือก Paper size เป็น 80mm/Receipt ใน More settings
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
