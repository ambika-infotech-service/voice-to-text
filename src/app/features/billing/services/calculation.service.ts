import { Service, inject } from '@angular/core';
import { InvoiceItem } from '../models/invoice.model';
import { PricingService } from './pricing.service';

/**
 * Service dedicated to performing pure arithmetic calculations for invoices.
 * Computes subtotals, taxable values, standard 18% GST, round-offs, and grand totals.
 */
@Service()
export class CalculationService {
  private readonly pricingService = inject(PricingService);

  /**
   * Computes the line item amount (Quantity * Rate).
   * @param quantity The number of items.
   * @param rate The price per unit.
   * @returns Calculated amount rounded to 2 decimal places.
   */
  public calculateItemAmount(quantity: number, rate: number): number {
    return this.pricingService.calculateFinalAmount(rate, quantity);
  }

  /**
   * Computes the invoice totals sheet.
   * @param items Array of current invoice line items.
   * @param discount Rupees discount amount applied to the invoice.
   */
  public calculateInvoiceTotals(
    items: InvoiceItem[],
    discount: number
  ): {
    subtotal: number;
    taxableAmount: number;
    gst: number;
    roundOff: number;
    grandTotal: number;
  } {
    // 1. Calculate subtotal (inclusive of GST)
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const roundedSubtotal = Math.round(subtotal * 100) / 100;

    // 2. Total Inclusive Value = Subtotal - Discount
    const validDiscount = Math.max(0, Math.min(discount, roundedSubtotal));
    const totalInclusive = Math.max(0, roundedSubtotal - validDiscount);

    // 3. Extract Taxable Amount and standard 18% GST (already included in prices)
    // Base Taxable Value = totalInclusive / 1.18
    // GST = totalInclusive - taxableAmount
    const taxableAmount = Math.round((totalInclusive / 1.18) * 100) / 100;
    const gst = Math.round((totalInclusive - taxableAmount) * 100) / 100;

    // 4. Raw Grand Total (inclusive)
    const rawGrandTotal = totalInclusive;

    // 5. Rounded Grand Total (Integer)
    const grandTotal = Math.round(rawGrandTotal);

    // 6. Round Off difference
    const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

    return {
      subtotal: roundedSubtotal,
      taxableAmount,
      gst,
      roundOff,
      grandTotal
    };
  }

  /**
   * Converts a numeric value into Rupees words (Indian numbering system format: Lakhs/Crores).
   * @param num The total amount.
   */
  public convertNumberToWords(num: number): string {
    const rounded = Math.floor(num);
    if (rounded <= 0) return 'Zero Rupees Only';

    const units = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convert = (n: number): string => {
      if (n < 20) return units[n];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + units[n % 10] : '');
      if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
      if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
      if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
      return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
    };

    return convert(rounded).trim() + ' Rupees Only';
  }

  /**
   * Computes a fuzzy similarity score between two strings using Levenshtein distance.
   * Returns a score between 0.0 (completely different) and 1.0 (exact match).
   * Incorporates substring match boosts to prioritize starts-with/contains mappings.
   */
  public getFuzzySimilarity(s1: string, s2: string): number {
    const str1 = s1.toLowerCase().trim();
    const str2 = s2.toLowerCase().trim();

    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1.0;

    // Substring containment optimizations
    if (str2.includes(str1)) {
      return 0.7 + (str1.length / str2.length) * 0.3;
    }
    if (str1.includes(str2)) {
      return 0.7 + (str2.length / str1.length) * 0.3;
    }

    const len1 = str1.length;
    const len2 = str2.length;
    const dp = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // Deletion
          dp[i][j - 1] + 1,      // Insertion
          dp[i - 1][j - 1] + cost // Substitution
        );
      }
    }

    const distance = dp[len1][len2];
    const maxLen = Math.max(len1, len2);
    return (maxLen - distance) / maxLen;
  }
}
