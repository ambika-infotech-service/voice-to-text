import { Component } from '@angular/core';
import { InvoiceForm } from '../../components/invoice-form/invoice-form';
import { InvoicePreview } from '../../components/invoice-preview/invoice-preview';

/**
 * Main container page for the Billing feature.
 * Features a split layout displaying the invoice inputs form on the left and sticky preview on the right.
 */
@Component({
  selector: 'app-billing-page',
  imports: [InvoiceForm, InvoicePreview],
  templateUrl: './billing-page.html',
  styleUrl: './billing-page.scss'
})
export class BillingPage { }
