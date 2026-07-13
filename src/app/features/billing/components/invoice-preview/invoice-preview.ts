import { Component, inject, computed } from '@angular/core';
import { InvoiceService } from '../../services/invoice.service';
import { CalculationService } from '../../services/calculation.service';
import { DecimalPipe, UpperCasePipe } from '@angular/common';

/**
 * Controller component for the high-fidelity A4 Invoice Preview.
 * Binds directly to the shared InvoiceService state and computes
 * Indian wording totals on modifications.
 */
@Component({
  selector: 'app-invoice-preview',
  imports: [DecimalPipe, UpperCasePipe],
  templateUrl: './invoice-preview.html',
  styleUrl: './invoice-preview.scss'
})
export class InvoicePreview {
  private readonly invoiceService = inject(InvoiceService);
  private readonly calcService = inject(CalculationService);

  // Read-only signal exposing the active invoice data
  protected readonly invoice = this.invoiceService.invoice;
  
  // Computed wording representation of the integer grand total figure
  protected readonly grandTotalWords = computed(() => 
    this.calcService.convertNumberToWords(this.invoice().grandTotal)
  );

  // Generates placeholder empty rows to prevent A4 height collapses in the live preview
  protected readonly emptyRows = computed(() => {
    const itemLength = this.invoice().items.length;
    const minRows = 6;
    return Array(Math.max(0, minRows - itemLength)).fill(0);
  });
}
