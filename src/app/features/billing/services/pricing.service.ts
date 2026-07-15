import { Service } from '@angular/core';

/**
 * Supported pricing types for product calculation rules.
 */
export enum PricingType {
  DIRECT_PRICE = 'DIRECT_PRICE',
  BASE_MINUS_DISCOUNT = 'BASE_MINUS_DISCOUNT',
  BASE_MINUS_DISCOUNT_MINUS_CASH = 'BASE_MINUS_DISCOUNT_MINUS_CASH',
  BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST = 'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST',
  BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT = 'BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT'
}

/**
 * Service managing dynamic pricing rules and calculations for products and invoices.
 */
@Service()
export class PricingService {
  /**
   * Computes the purchase price based on pricing type, discounts, GST, and extra charges.
   */
  public calculatePurchasePrice(
    basePrice: number,
    discountPercent: number,
    cashDiscountPercent: number,
    gstPercent: number,
    profitPercent: number,
    extraCharges: number,
    roundOff: number,
    pricingType: string
  ): number {
    if (pricingType === PricingType.DIRECT_PRICE) {
      return basePrice;
    }

    // Step 1: Base minus discount
    let net = basePrice * (1 - (discountPercent || 0) / 100);

    // Step 2: Less cash discount
    if (pricingType !== PricingType.BASE_MINUS_DISCOUNT) {
      net = net * (1 - (cashDiscountPercent || 0) / 100);
    }

    // Step 3: Add GST
    let purchasePrice = net;
    if (
      pricingType === PricingType.BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST ||
      pricingType === PricingType.BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT
    ) {
      purchasePrice = net * (1 + (gstPercent || 0) / 100);
    }

    // Step 4: Add extra charges
    purchasePrice += (extraCharges || 0);

    return Math.round(purchasePrice * 100) / 100;
  }

  /**
   * Computes the selling price based on purchase price, profit margin, and round off.
   */
  public calculateSellingPrice(
    basePrice: number,
    discountPercent: number,
    cashDiscountPercent: number,
    gstPercent: number,
    profitPercent: number,
    extraCharges: number,
    roundOff: number,
    pricingType: string
  ): number {
    if (pricingType === PricingType.DIRECT_PRICE) {
      return basePrice;
    }

    // Step 1: Base minus discount
    let net = basePrice * (1 - (discountPercent || 0) / 100);

    // Step 2: Less cash discount
    if (pricingType !== PricingType.BASE_MINUS_DISCOUNT) {
      net = net * (1 - (cashDiscountPercent || 0) / 100);
    }

    // Step 3: Add GST
    let purchasePriceRaw = net;
    if (
      pricingType === PricingType.BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST ||
      pricingType === PricingType.BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT
    ) {
      purchasePriceRaw = net * (1 + (gstPercent || 0) / 100);
    }

    // Step 4: Add extra charges
    purchasePriceRaw += (extraCharges || 0);

    let sellingPrice = purchasePriceRaw;
    if (pricingType === PricingType.BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT) {
      sellingPrice = purchasePriceRaw * (1 + (profitPercent || 0) / 100);
    }

    // Add round-off offset
    sellingPrice += (roundOff || 0);

    return Math.round(sellingPrice * 100) / 100;
  }

  /**
   * Computes the GST value component applied to the net rate.
   */
  public calculateGST(
    basePrice: number,
    discountPercent: number,
    cashDiscountPercent: number,
    gstPercent: number,
    profitPercent: number,
    extraCharges: number,
    roundOff: number,
    pricingType: string
  ): number {
    if (
      pricingType !== PricingType.BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST &&
      pricingType !== PricingType.BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT
    ) {
      return 0;
    }

    const priceBeforeGst =
      basePrice * (1 - (discountPercent || 0) / 100) * (1 - (cashDiscountPercent || 0) / 100);
    const gstVal = priceBeforeGst * ((gstPercent || 0) / 100);

    return Math.round(gstVal * 100) / 100;
  }

  /**
   * Computes the profit margin value component applied on top of the purchase price.
   */
  public calculateProfit(
    basePrice: number,
    discountPercent: number,
    cashDiscountPercent: number,
    gstPercent: number,
    profitPercent: number,
    extraCharges: number,
    roundOff: number,
    pricingType: string
  ): number {
    if (pricingType !== PricingType.BASE_MINUS_DISCOUNT_MINUS_CASH_PLUS_GST_PLUS_PROFIT) {
      return 0;
    }

    const purchasePrice = this.calculatePurchasePrice(
      basePrice,
      discountPercent,
      cashDiscountPercent,
      gstPercent,
      profitPercent,
      extraCharges,
      0,
      pricingType
    );
    const profitVal = purchasePrice * ((profitPercent || 0) / 100);

    return Math.round(profitVal * 100) / 100;
  }

  /**
   * Calculates the final item row amount (Selling Price * Quantity).
   */
  public calculateFinalAmount(sellingPrice: number, quantity: number): number {
    if (sellingPrice < 0 || quantity < 0) return 0;
    return Math.round(sellingPrice * quantity * 100) / 100;
  }
}
