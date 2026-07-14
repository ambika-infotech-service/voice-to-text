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
import { CustomerService } from '../../../customers/services/customer.service';
import { BusinessContactService } from '../../../business-contacts/services/business-contact.service';

/**
 * Controller component for the Billing Form panel.
 * Builds and validates the customer / business contact data and the product lines list.
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
  private readonly customerService = inject(CustomerService);
  private readonly businessContactService = inject(BusinessContactService);

  private readonly destroy$ = new Subject<void>();

  protected invoiceForm!: FormGroup;
  protected readonly availableProducts = signal<any[]>([]);
  protected readonly activeMicRowIndex = signal<number | null>(null);
  protected readonly selectedVoiceLang = signal('en-US');

  // Toggle state between Customer vs. Business Contact
  protected readonly billingType = signal<'customer' | 'business_contact'>('customer');

  // Customer search autocomplete UI states
  protected readonly showCustomerDropdown = signal(false);
  protected readonly filteredCustomers = signal<any[]>([]);
  protected readonly customerSearchQuery = signal('');
  protected readonly customerContacts = signal<any[]>([]);

  // Business Contact search autocomplete UI states
  protected readonly showContactDropdown = signal(false);
  protected readonly filteredContacts = signal<any[]>([]);
  protected readonly contactSearchQuery = signal('');

  constructor() {
    // Effect to monitor customer search text changes
    effect(async () => {
      const query = this.customerSearchQuery();
      if (!query.trim()) {
        this.filteredCustomers.set([]);
        return;
      }
      try {
        const results = await this.customerService.searchCustomer(query);
        this.filteredCustomers.set(results);
      } catch (err) {
        console.error('Customer autocomplete search failed:', err);
      }
    });

    // Effect to monitor business contact search text changes
    effect(async () => {
      const query = this.contactSearchQuery();
      if (!query.trim()) {
        this.filteredContacts.set([]);
        return;
      }
      try {
        const results = await this.businessContactService.searchContacts(query);
        this.filteredContacts.set(results);
      } catch (err) {
        console.error('Business contact autocomplete search failed:', err);
      }
    });

    // Voice assistant transcription handler
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
                  group.patchValue({
                    itemName: result.bestMatch.DisplayName,
                    unit: mapUnitToStandard(parsed.unit) ?? result.bestMatch.Unit,
                    rate: result.bestMatch.SellingPrice,
                    quantity: parsed.quantity ?? 1
                  });
                } else {
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

    this.addItemRow();
    this.loadProducts();

    // Listen to customerName input changes to fetch autocomplete search matches
    const nameControl = this.invoiceForm.get('customerName');
    if (nameControl) {
      nameControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
        const query = val || '';
        if (this.billingType() === 'customer') {
          this.customerSearchQuery.set(query);
          const matchesExact = this.filteredCustomers().some(c => c.customer_name === query);
          if (matchesExact) {
            this.showCustomerDropdown.set(false);
          } else if (query.trim().length >= 2) {
            this.showCustomerDropdown.set(true);
          } else {
            this.showCustomerDropdown.set(false);
          }
        } else {
          this.contactSearchQuery.set(query);
          const matchesExact = this.filteredContacts().some(c => c.name === query);
          if (matchesExact) {
            this.showContactDropdown.set(false);
          } else if (query.trim().length >= 2) {
            this.showContactDropdown.set(true);
          } else {
            this.showContactDropdown.set(false);
          }
        }
      });
    }
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
      companyName: [currentInvoice.companyName || ''],
      purchasedBy: [currentInvoice.purchasedBy || 'Self (Owner)', Validators.required],
      customerMobile: [currentInvoice.customerMobile, [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      customerAddress: [currentInvoice.customerAddress],
      notes: [currentInvoice.notes],
      discount: [currentInvoice.discount, [Validators.required, Validators.min(0)]],
      customerId: [currentInvoice.customerId || null],
      customerContactId: [currentInvoice.customerContactId || null],
      contactId: [currentInvoice.contactId || null]
    });

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
    if (this.items.length === 0) {
      this.addItemRow();
    }
  }

  private setupFormSync(): void {
    this.invoiceForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      // 1. Process line-item multiplication
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

      // Automatically map customerContactId on purchasedBy selections
      let customerContactIdVal = value.customerContactId || null;
      if (this.billingType() === 'customer' && value.purchasedBy !== 'Self (Owner)') {
        const matchingContact = this.customerContacts().find(c => c.contact_name === value.purchasedBy);
        if (matchingContact) {
          customerContactIdVal = matchingContact.id;
        }
      }

      // 2. Broadcast updated metadata
      this.invoiceService.updateInvoiceFields({
        invoiceNo: value.invoiceNo,
        invoiceDate: value.invoiceDate,
        customerName: value.customerName,
        companyName: value.companyName || '',
        purchasedBy: value.purchasedBy || (this.billingType() === 'customer' ? 'Self (Owner)' : ''),
        customerMobile: value.customerMobile,
        customerAddress: value.customerAddress,
        notes: value.notes,
        discount: Number(value.discount || 0),
        customerId: value.customerId || null,
        customerContactId: customerContactIdVal,
        contactId: value.contactId || null
      });

      // 3. Broadcast items
      this.invoiceService.updateInvoiceItems(this.items.value || []);
    });
  }

  protected setBillingType(type: 'customer' | 'business_contact'): void {
    this.billingType.set(type);

    const mobileCtrl = this.invoiceForm.get('customerMobile');
    if (type === 'business_contact') {
      mobileCtrl?.setValidators([Validators.pattern(/^[0-9]{10}$/)]); // Mobile optional for business contacts
    } else {
      mobileCtrl?.setValidators([Validators.required, Validators.pattern(/^[0-9]{10}$/)]);
    }
    mobileCtrl?.updateValueAndValidity();

    this.invoiceForm.patchValue({
      customerName: '',
      companyName: '',
      purchasedBy: type === 'customer' ? 'Self (Owner)' : '',
      customerMobile: '',
      customerAddress: '',
      customerId: null,
      customerContactId: null,
      contactId: null
    }, { emitEvent: false });

    this.customerSearchQuery.set('');
    this.contactSearchQuery.set('');
    this.customerContacts.set([]);
    this.filteredCustomers.set([]);
    this.filteredContacts.set([]);
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
    this.customerContacts.set([]);
    this.filteredContacts.set([]);
    this.billingType.set('customer');
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

  protected onCustomerSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (this.billingType() === 'customer') {
      this.customerSearchQuery.set(val);
      this.showCustomerDropdown.set(true);
    } else {
      this.contactSearchQuery.set(val);
      this.showContactDropdown.set(true);
    }
  }

  protected onCustomerFocus(): void {
    if (this.billingType() === 'customer') {
      const val = this.invoiceForm.get('customerName')?.value || '';
      this.customerSearchQuery.set(val);
      this.showCustomerDropdown.set(true);
    } else {
      const val = this.invoiceForm.get('customerName')?.value || '';
      this.contactSearchQuery.set(val);
      this.showContactDropdown.set(true);
    }
  }

  protected onCustomerBlur(): void {
    setTimeout(() => {
      this.showCustomerDropdown.set(false);
      this.showContactDropdown.set(false);
    }, 250);
  }

  protected async selectCustomer(customer: any): Promise<void> {
    let fullAddress = customer.address || '';
    const addressParts = [customer.city, customer.state, customer.pincode].filter(p => !!p);
    if (addressParts.length > 0) {
      fullAddress += (fullAddress ? '\n' : '') + addressParts.join(', ');
    }

    try {
      const list = await this.customerService.getContactsByCustomer(customer.id);
      this.customerContacts.set(list);
    } catch (err) {
      console.error('Failed to load customer contacts:', err);
      this.customerContacts.set([]);
    }

    this.invoiceForm.patchValue({
      customerName: customer.customer_name,
      companyName: customer.company_name || '',
      purchasedBy: 'Self (Owner)',
      customerMobile: customer.mobile || '',
      customerAddress: fullAddress,
      customerId: customer.id,
      customerContactId: null,
      contactId: null
    }, { emitEvent: false });

    this.customerSearchQuery.set(customer.customer_name);
    this.showCustomerDropdown.set(false);
  }

  protected selectBusinessContact(contact: any): void {
    let fullAddress = contact.address || '';
    const addressParts = [contact.city, contact.state, contact.pincode].filter(p => !!p);
    if (addressParts.length > 0) {
      fullAddress += (fullAddress ? '\n' : '') + addressParts.join(', ');
    }

    this.invoiceForm.patchValue({
      customerName: contact.name,
      companyName: '',
      purchasedBy: contact.roles ? contact.roles.join(', ') : '',
      customerMobile: contact.mobile || '',
      customerAddress: fullAddress,
      customerId: null,
      customerContactId: null,
      contactId: contact.id
    }, { emitEvent: false });

    this.contactSearchQuery.set(contact.name);
    this.showContactDropdown.set(false);
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
