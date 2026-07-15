import { Component, signal } from '@angular/core';
import { InvoiceForm } from '../../components/invoice-form/invoice-form';
import { InvoicePreview } from '../../components/invoice-preview/invoice-preview';

/**
 * Main container page for the Billing feature.
 * Features a split layout displaying the invoice inputs form on the left and sticky preview on the right.
 * On mobile viewports, displays a segmented tab toggle control to swap between forms and print sheets.
 */
@Component({
  selector: 'app-billing-page',
  imports: [InvoiceForm, InvoicePreview],
  templateUrl: './billing-page.html',
  styleUrl: './billing-page.scss'
})
export class BillingPage {
  // Tracks active view on mobile: 'form' for form inputs, 'preview' for A4 print invoice preview
  protected readonly activeMobileView = signal<'form' | 'preview'>('form');

  protected setMobileView(view: 'form' | 'preview'): void {
    this.activeMobileView.set(view);
  }
}
