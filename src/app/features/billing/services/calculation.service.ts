import { Service } from '@angular/core';
import { InvoiceItem } from '../models/invoice.model';

/**
 * Service dedicated to performing pure arithmetic calculations for invoices.
 * Computes subtotals, taxable values, standard 18% GST, round-offs, and grand totals.
 */
@Service()
export class CalculationService {
  /**
   * Computes the line item amount (Quantity * Rate).
   * @param quantity The number of items.
   * @param rate The price per unit.
   * @returns Calculated amount rounded to 2 decimal places.
   */
  public calculateItemAmount(quantity: number, rate: number): number {
    if (quantity < 0 || rate < 0) return 0;
    return Math.round(quantity * rate * 100) / 100;
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
    gst: number;
    roundOff: number;
    grandTotal: number;
  } {
    // 1. Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const roundedSubtotal = Math.round(subtotal * 100) / 100;

    // 2. Taxable Value = Subtotal - Discount
    const validDiscount = Math.max(0, Math.min(discount, roundedSubtotal));
    const taxableValue = Math.max(0, roundedSubtotal - validDiscount);

    // 3. GST = 18% of taxable value
    const gst = Math.round(taxableValue * 0.18 * 100) / 100;

    // 4. Raw Grand Total
    const rawGrandTotal = taxableValue + gst;

    // 5. Rounded Grand Total (Integer)
    const grandTotal = Math.round(rawGrandTotal);

    // 6. Round Off difference
    const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

    return {
      subtotal: roundedSubtotal,
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
}
