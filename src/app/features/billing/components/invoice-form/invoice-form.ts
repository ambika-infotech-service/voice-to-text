import { Component, OnInit, OnDestroy, inject, signal, effect } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { InvoiceService } from '../../services/invoice.service';
import { PdfService } from '../../services/pdf.service';
import { InvoiceRow } from '../invoice-row/invoice-row';
import { InvoiceTotals } from '../invoice-totals/invoice-totals';
import { ProductRepository } from '../../../../core/database/repositories/product';
import { Product } from '../../../../core/database/models/product.model';
import { SpeechService } from '../../../../core/speech/services/speech';
import { ProductSearchService } from '../../../../core/search/services/product-search.service';
import { extractQuantityAndUnit, mapUnitToStandard } from '../../../../core/search/utils/normalization';


/**
 * Controller component for the Billing Form panel.
 * Builds and validates the customer data and the product lines list.
 * Automatically synchronizes changes to the global invoice signal store.
 */
@Component({
  selector: 'app-invoice-form',
  imports: [ReactiveFormsModule, InvoiceRow, InvoiceTotals],
  templateUrl: './invoice-form.html',
  styleUrl: './invoice-form.scss'
})
export class InvoiceForm implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly invoiceService = inject(InvoiceService);
  private readonly pdfService = inject(PdfService);
  private readonly productRepo = inject(ProductRepository);
  protected readonly speechService = inject(SpeechService);
  private readonly searchService = inject(ProductSearchService);

  private readonly destroy$ = new Subject<void>();

  protected invoiceForm!: FormGroup;
  protected readonly availableProducts = signal<any[]>([]);
  protected readonly activeMicRowIndex = signal<number | null>(null);
  protected readonly selectedVoiceLang = signal('en-US');

  constructor() {
    effect(() => {
      const activeIdx = this.activeMicRowIndex();
      if (activeIdx === null) return;

      const state = this.speechService.state();
      const text = state.finalTranscript || state.transcript;

      if (text) {
        const group = this.getItemGroup(activeIdx);
        if (group) {
          group.get('itemName')?.setValue(text);
          group.get('itemName')?.updateValueAndValidity({ emitEvent: true });
        }
      }

      // Automatically reset listening state once completed or encountered an error
      if (state.status === 'error' || (state.status === 'idle' && state.finalTranscript)) {
        const finalQuery = state.finalTranscript;
        const targetIndex = activeIdx;

        setTimeout(async () => {
          this.activeMicRowIndex.set(null);

          if (finalQuery) {
            try {
              const parsed = extractQuantityAndUnit(finalQuery);
              const result = await this.searchService.searchProducts(parsed.cleanText);
              const group = this.getItemGroup(targetIndex);
              if (group) {
                if (result.bestMatch && result.confidence > 90) {
                  // High confidence -> auto-populate row details with parsed metrics
                  group.patchValue({
                    itemName: result.bestMatch.DisplayName,
                    unit: mapUnitToStandard(parsed.unit) ?? result.bestMatch.Unit,
                    rate: result.bestMatch.SellingPrice,
                    quantity: parsed.quantity ?? 1
                  });
                } else {
                  // Medium/low confidence -> set value so user is prompted with options
                  group.patchValue({
                    itemName: finalQuery
                  });
                }
              }
            } catch (err) {
              console.error('Voice search failed:', err);
            }
          }
        }, 100);
      }
    });
  }

  public ngOnInit(): void {
    this.initializeForm();
    this.setupFormSync();

    // Seed with a default product row to ensure a good first-glance user experience
    this.addItemRow();

    this.loadProducts();
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const currentInvoice = this.invoiceService.invoice();

    this.invoiceForm = this.fb.group({
      invoiceNo: [currentInvoice.invoiceNo, Validators.required],
      invoiceDate: [currentInvoice.invoiceDate, Validators.required],
      customerName: [currentInvoice.customerName, [Validators.required, Validators.minLength(3)]],
      customerMobile: [currentInvoice.customerMobile, [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      customerAddress: [currentInvoice.customerAddress],
      notes: [currentInvoice.notes],
      discount: [currentInvoice.discount, [Validators.required, Validators.min(0)]]
    });

    // Re-bind or create FormArray for product rows
    this.invoiceForm.setControl('items', this.fb.array([]));
  }

  protected get items(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  protected getItemGroup(index: number): FormGroup {
    return this.items.at(index) as FormGroup;
  }

  protected addItemRow(): void {
    const itemGroup = this.fb.group({
      itemName: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unit: ['Pcs', Validators.required],
      rate: [0, [Validators.required, Validators.min(0)]],
      amount: [0]
    });

    this.items.push(itemGroup);
  }

  protected deleteItemRow(index: number): void {
    this.items.removeAt(index);
    // Maintain at least one row in the grid for styling cohesion
    if (this.items.length === 0) {
      this.addItemRow();
    }
  }

  private setupFormSync(): void {
    this.invoiceForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      // 1. Process line-item multiplication (Qty * Rate) cleanly in-place
      const itemsArray = this.items;
      for (let i = 0; i < itemsArray.length; i++) {
        const group = itemsArray.at(i) as FormGroup;
        const qty = Number(group.get('quantity')?.value || 0);
        const rate = Number(group.get('rate')?.value || 0);
        const amount = Math.round(qty * rate * 100) / 100;

        if (group.get('amount')?.value !== amount) {
          group.get('amount')?.setValue(amount, { emitEvent: false });
        }
      }

      // 2. Broadcast updated customer metadata fields
      this.invoiceService.updateInvoiceFields({
        invoiceNo: value.invoiceNo,
        invoiceDate: value.invoiceDate,
        customerName: value.customerName,
        customerMobile: value.customerMobile,
        customerAddress: value.customerAddress,
        notes: value.notes,
        discount: Number(value.discount || 0)
      });

      // 3. Broadcast updated line items
      this.invoiceService.updateInvoiceItems(this.items.value || []);
    });
  }

  protected onGeneratePdf(): void {
    if (this.invoiceForm.invalid) {
      this.markFormGroupTouched(this.invoiceForm);
      return;
    }
    this.pdfService.generateInvoicePdf('a4-invoice-preview', this.invoiceForm.get('invoiceNo')?.value);
  }

  protected onPrint(): void {
    if (this.invoiceForm.invalid) {
      this.markFormGroupTouched(this.invoiceForm);
      return;
    }
    this.pdfService.printInvoice();
  }

  protected onReset(): void {
    this.invoiceForm.reset();
    this.invoiceService.resetInvoice();
    this.initializeForm();
    this.setupFormSync();
    this.addItemRow();
  }

  protected toggleVoiceSearch(index: number): void {
    const isListening = this.activeMicRowIndex() === index;
    if (isListening) {
      this.speechService.stop();
      this.activeMicRowIndex.set(null);
    } else {
      this.speechService.reset();
      this.speechService.setLanguage(this.selectedVoiceLang());
      this.activeMicRowIndex.set(index);
      this.speechService.start();
    }
  }

  protected changeVoiceLang(event: Event): void {
    const lang = (event.target as HTMLSelectElement).value;
    this.selectedVoiceLang.set(lang);
    this.speechService.setLanguage(lang);
  }

  private async loadProducts(): Promise<void> {
    try {
      const list = await this.productRepo.getAllWithKeywords();
      this.availableProducts.set(list);
    } catch (err) {
      console.error('Failed to load products for billing autocomplete:', err);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.values(formGroup.controls).forEach(control => {
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control.markAsTouched();
      }
    });
  }
}
