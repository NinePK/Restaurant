import { formatBangkokDateInput } from "@/lib/business-time";

export type PromotionDiscountType = "flat" | "percent";

export interface BillingPromotion {
  id: string;
  name: string;
  description?: string | null;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  isActive: boolean;
  discountType?: string | null;
  discountValue?: number | null;
  minOrderAmount?: number | null;
  autoApply: boolean;
  canStack: boolean;
}

export interface AppliedPromotion extends BillingPromotion {
  discountAmount: number;
}

export function isPromotionConfiguredForBilling(promotion: BillingPromotion): boolean {
  return (
    (promotion.discountType === "flat" || promotion.discountType === "percent") &&
    typeof promotion.discountValue === "number" &&
    promotion.discountValue > 0
  );
}

export function calculateManualDiscountAmount(
  subtotal: number,
  discountValue: number,
  discountType: PromotionDiscountType
): number {
  if (discountValue <= 0 || subtotal <= 0) return 0;

  if (discountType === "percent") {
    return subtotal * (discountValue / 100);
  }

  return discountValue;
}

export function calculatePromotionDiscountAmount(
  promotion: BillingPromotion,
  subtotal: number
): number {
  if (!isPromotionConfiguredForBilling(promotion) || subtotal <= 0) return 0;

  if (promotion.discountType === "percent") {
    return subtotal * ((promotion.discountValue || 0) / 100);
  }

  return promotion.discountValue || 0;
}

export function getPromotionEligibilityReason(
  promotion: BillingPromotion,
  subtotal: number,
  now = new Date()
): string | null {
  if (!promotion.isActive) return "ปิดใช้งานอยู่";
  if (!isPromotionConfiguredForBilling(promotion)) return "ยังไม่ได้ตั้งค่าส่วนลด";

  const today = formatBangkokDateInput(now);
  const startDate = formatBangkokDateInput(promotion.startDate);
  const endDate = formatBangkokDateInput(promotion.endDate);

  if (startDate && startDate > today) {
    return "ยังไม่ถึงช่วงเวลาใช้งาน";
  }

  if (endDate && endDate < today) {
    return "หมดอายุแล้ว";
  }

  if (promotion.minOrderAmount && subtotal < promotion.minOrderAmount) {
    return `ใช้ได้เมื่อยอดครบ ${promotion.minOrderAmount.toLocaleString("th-TH")} บาท`;
  }

  return null;
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

export function resolveAppliedPromotions(
  promotions: BillingPromotion[],
  selectedPromotionIds: string[],
  subtotal: number,
  now = new Date()
) {
  const promotionMap = new Map(promotions.map((promotion) => [promotion.id, promotion]));
  const eligibilityById = new Map(
    promotions.map((promotion) => [
      promotion.id,
      getPromotionEligibilityReason(promotion, subtotal, now),
    ])
  );

  const eligiblePromotions = promotions.filter(
    (promotion) => !eligibilityById.get(promotion.id)
  );

  const autoCandidates = eligiblePromotions.filter((promotion) => promotion.autoApply);
  let autoAppliedIds = autoCandidates.map((promotion) => promotion.id);
  const autoNonStackables = autoCandidates.filter((promotion) => !promotion.canStack);

  if (autoNonStackables.length > 0) {
    autoAppliedIds = [
      autoNonStackables
        .slice()
        .sort(
          (a, b) =>
            calculatePromotionDiscountAmount(b, subtotal) -
            calculatePromotionDiscountAmount(a, subtotal)
        )[0].id,
    ];
  }

  const autoAppliedSet = new Set(autoAppliedIds);
  const eligibleSelectedIds = uniqueIds(selectedPromotionIds).filter((id) => {
    const promotion = promotionMap.get(id);
    return promotion && !eligibilityById.get(id);
  });

  let appliedIds = autoAppliedIds.slice();
  const lockedByAutoNonStackable = autoAppliedIds.some((id) => {
    const promotion = promotionMap.get(id);
    return promotion && !promotion.canStack;
  });

  if (!lockedByAutoNonStackable) {
    for (const id of eligibleSelectedIds) {
      if (!autoAppliedSet.has(id)) {
        appliedIds.push(id);
      }
    }
  }

  let appliedPromotions = uniqueIds(appliedIds)
    .map((id) => promotionMap.get(id))
    .filter((promotion): promotion is BillingPromotion => Boolean(promotion));

  if (appliedPromotions.length > 1) {
    const nonStackable = appliedPromotions.filter((promotion) => !promotion.canStack);
    if (nonStackable.length > 0) {
      const primaryPromotion = nonStackable
        .slice()
        .sort(
          (a, b) =>
            calculatePromotionDiscountAmount(b, subtotal) -
            calculatePromotionDiscountAmount(a, subtotal)
        )[0];

      appliedPromotions = [primaryPromotion];
    }
  }

  return {
    eligibilityById,
    autoAppliedIds,
    appliedPromotions: appliedPromotions.map((promotion) => ({
      ...promotion,
      discountAmount: calculatePromotionDiscountAmount(promotion, subtotal),
    })) satisfies AppliedPromotion[],
  };
}

export function getPromotionDiscountLabel(promotion: BillingPromotion): string {
  if (!isPromotionConfiguredForBilling(promotion)) return "ยังไม่ได้ตั้งค่าส่วนลด";

  if (promotion.discountType === "percent") {
    return `ลด ${promotion.discountValue}%`;
  }

  return `ลด ${Number(promotion.discountValue || 0).toLocaleString("th-TH")} บาท`;
}
