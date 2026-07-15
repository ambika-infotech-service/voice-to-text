/**
 * Represents the calculation rule used to compute purchase and selling price.
 */
export interface PricingRule {
  readonly id?: number;
  readonly variantId: number;
  readonly priceListId?: number | null;
  readonly pricingType: string; // DIRECT_PRICE, BASE_MINUS_DISCOUNT, etc.
  readonly basePrice?: number;
  readonly discountPercent?: number;
  readonly cashDiscountPercent?: number;
  readonly gstPercent?: number;
  readonly profitPercent?: number;
  readonly extraCharges?: number;
  readonly roundOff?: number;
  readonly effectiveDate?: string | null;
  readonly expiryDate?: string | null;
  readonly isDefault?: number;
  readonly isActive?: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}
