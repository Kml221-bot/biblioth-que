const UNLIMITED_PLANS = new Set(["student", "etudiant", "premium", "school", "school_s", "school_l"]);

export interface BorrowPriceInput {
  prix_location?: number | null;
  prix_location_7j?: number | null;
  prix_location_30j?: number | null;
}

export interface MarketplaceSplit {
  commissionPct: number;
  buyerPays?: number;
  sellerReceives: number;
  platformReceives: number;
}

export function calculatePenaltyAmount(daysLate: number): number {
  if (daysLate <= 0) return 0;
  if (daysLate <= 7) return 300;
  if (daysLate <= 14) return 500;
  return 800;
}

export function isUnlimitedBorrowPlan(plan: string): boolean {
  return UNLIMITED_PLANS.has(String(plan || "").toLowerCase());
}

export function canBorrowForPlan(plan: string, remainingBorrows: number | null | undefined): boolean {
  if (isUnlimitedBorrowPlan(plan)) return true;
  return Number(remainingBorrows || 0) > 0;
}

export function calculateBorrowPrice(book: BorrowPriceInput, durationDays: number): number {
  const price7 = Number(book.prix_location_7j ?? book.prix_location ?? 500);
  const price30 = Number(book.prix_location_30j ?? Math.max(price7, 800));

  if (durationDays === 7) return Math.max(0, Math.round(price7));
  if (durationDays === 30) return Math.max(0, Math.round(price30));

  const ratio = (durationDays - 7) / 23;
  return Math.max(0, Math.round(price7 + (price30 - price7) * ratio));
}

export function calculateRenewalPrice(durationDays: number): number {
  return durationDays === 14 ? 350 : 200;
}

export function calculateMarketplaceSplit(priceDisplayed: number, listingType: string | null | undefined): MarketplaceSplit {
  const commissionPct = listingType === "numerique" ? 8 : 5;
  const platformReceives = Math.round(Number(priceDisplayed || 0) * commissionPct / 100);
  return {
    commissionPct,
    buyerPays: Number(priceDisplayed || 0),
    platformReceives,
    sellerReceives: Math.max(0, Number(priceDisplayed || 0) - platformReceives),
  };
}

export function calculateMarketplaceSplitFromSellerNet(sellerNetPrice: number, commissionPct = 20): MarketplaceSplit {
  const sellerReceives = Math.max(0, Math.round(Number(sellerNetPrice || 0)));
  const platformReceives = Math.round(sellerReceives * commissionPct / 100);

  return {
    commissionPct,
    buyerPays: sellerReceives + platformReceives,
    platformReceives,
    sellerReceives,
  };
}

export function signedUrlExpiresAt(now = new Date(), ttlSeconds = 3600): string {
  return new Date(now.getTime() + ttlSeconds * 1000).toISOString();
}
