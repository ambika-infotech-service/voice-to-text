import { Service, inject, signal } from '@angular/core';
import { Invoice, InvoiceItem } from '../models/invoice.model';
import { CalculationService } from './calculation.service';

/**
 * Service managing the active state of the current invoice using Angular Signals.
 * Integrates directly with CalculationService to auto-compute invoice totals on state mutations.
 */
@Service()
export class InvoiceService {
  private readonly calcService = inject(CalculationService);

  // Default empty invoice state template
  private getInitialInvoice(): Invoice {
    const randomNo = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().substring(0, 10);
    return {
      invoiceNo: `INV-${new Date().getFullYear()}-${randomNo}`,
      invoiceDate: dateStr,
      customerName: '',
      customerMobile: '',
      customerAddress: '',
      notes: 'Thank you for shopping with us!', // 'Goods once sold cannot be returned.',
      items: [],
      subtotal: 0,
      discount: 0,
      taxableAmount: 0,
      gst: 0,
      roundOff: 0,
      grandTotal: 0
    };
  }

  private readonly invoiceState = signal<Invoice>(this.getInitialInvoice());

  // Public read-only signal exposing current invoice state to preview panels and totals cards
  public readonly invoice = this.invoiceState.asReadonly();

  /**
   * Updates non-item invoice header fields (Customer data, date, notes, discount).
   * Automatically triggers invoice totals recalculation.
   */
  public updateInvoiceFields(
    fields: Partial<Omit<Invoice, 'items' | 'subtotal' | 'gst' | 'roundOff' | 'grandTotal'>>
  ): void {
    this.invoiceState.update(state => {
      const updated = { ...state, ...fields };
      const totals = this.calcService.calculateInvoiceTotals(updated.items, updated.discount);
      return { ...updated, ...totals };
    });
  }

  /**
   * Updates the array of product items.
   * Auto-computes individual item line amounts and triggers full totals recalculation.
   */
  public updateInvoiceItems(items: InvoiceItem[]): void {
    this.invoiceState.update(state => {
      const processedItems = items.map(item => ({
        ...item,
        amount: this.calcService.calculateItemAmount(item.quantity, item.rate)
      }));
      const totals = this.calcService.calculateInvoiceTotals(processedItems, state.discount);
      return {
        ...state,
        items: processedItems,
        ...totals
      };
    });
  }

  /**
   * Resets the active invoice back to default empty settings with a new generated Invoice No.
   */
  public resetInvoice(): void {
    this.invoiceState.set(this.getInitialInvoice());
  }
}
