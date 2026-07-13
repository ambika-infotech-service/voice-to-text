import { Component, inject } from '@angular/core';
import { InvoiceService } from '../../services/invoice.service';
import { DecimalPipe } from '@angular/common';

/**
 * Component that displays the calculated invoice totals (Subtotal, GST, Round Off, Grand Total).
 * Automatically updates reactively based on updates to the InvoiceService state.
 */
@Component({
  selector: 'app-invoice-totals',
  imports: [DecimalPipe],
  templateUrl: './invoice-totals.html',
  styleUrl: './invoice-totals.scss'
})
export class InvoiceTotals {
  // Inject the singleton invoice service representing the single source of truth
  private readonly invoiceService = inject(InvoiceService);

  // Read-only reference to the active invoice state signal
  protected readonly invoice = this.invoiceService.invoice;
}
