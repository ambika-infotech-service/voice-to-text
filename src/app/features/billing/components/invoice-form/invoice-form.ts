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

  // Unified search autocomplete UI states
  protected readonly showDropdown = signal(false);
  protected readonly filteredResults = signal<any[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly customerContacts = signal<any[]>([]);

  constructor() {
    // Effect to monitor search text changes and combine results
    effect(async () => {
      const query = this.searchQuery();
      if (!query.trim()) {
        this.filteredResults.set([]);
        return;
      }
      try {
        const [customers, contacts] = await Promise.all([
          this.customerService.searchCustomer(query),
          this.businessContactService.searchContacts(query)
        ]);

        const mappedCustomers = customers.map(c => ({
          uniqueId: `customer-${c.id}`,
          type: 'customer' as const,
          id: c.id,
          displayName: c.customer_name,
          companyName: c.company_name || '',
          mobile: c.mobile || '',
          address: c.address || '',
          city: c.city || '',
          state: c.state || '',
          pincode: c.pincode || '',
          raw: c
        }));

        const mappedContacts = contacts.map(c => ({
          uniqueId: `contact-${c.id}`,
          type: 'business_contact' as const,
          id: c.id,
          displayName: c.name,
          companyName: '',
          mobile: c.mobile || '',
          address: c.address || '',
          city: c.city || '',
          state: c.state || '',
          pincode: c.pincode || '',
          roles: c.roles || [],
          raw: c
        }));

        this.filteredResults.set([...mappedCustomers, ...mappedContacts]);
      } catch (err) {
        console.error('Combined autocomplete search failed:', err);
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

    // If customerId is set, fetch customer contacts
    const currentInvoice = this.invoiceService.invoice();
    if (currentInvoice.customerId) {
      this.customerService.getContactsByCustomer(currentInvoice.customerId)
        .then(contacts => this.customerContacts.set(contacts))
        .catch(err => console.error('Failed to load initial customer contacts:', err));
    }

    // Listen to customerName input changes to fetch autocomplete search matches
    const nameControl = this.invoiceForm.get('customerName');
    if (nameControl) {
      nameControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(val => {
        const query = val || '';
        this.searchQuery.set(query);
        const matchesExact = this.filteredResults().some(r => r.displayName === query);
        if (matchesExact) {
          this.showDropdown.set(false);
        } else if (query.trim().length >= 2) {
          this.showDropdown.set(true);
        } else {
          this.showDropdown.set(false);
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
    const isContact = !!currentInvoice.contactId;

    if (isContact) {
      this.billingType.set('business_contact');
    } else {
      this.billingType.set('customer');
    }

    this.invoiceForm = this.fb.group({
      invoiceNo: [currentInvoice.invoiceNo, Validators.required],
      invoiceDate: [currentInvoice.invoiceDate, Validators.required],
      customerName: [currentInvoice.customerName, [Validators.required, Validators.minLength(3)]],
      companyName: [currentInvoice.companyName || ''],
      purchasedBy: [
        currentInvoice.purchasedBy || (isContact ? '' : 'Self (Owner)'),
        Validators.required
      ],
      customerMobile: [
        currentInvoice.customerMobile,
        isContact
          ? [Validators.pattern(/^[0-9]{10}$/)]
          : [Validators.required, Validators.pattern(/^[0-9]{10}$/)]
      ],
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

  // Removed manual setBillingType since we infer it from selected autocomplete item.

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
    this.filteredResults.set([]);
    this.searchQuery.set('');
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
    this.searchQuery.set(val);
    this.showDropdown.set(true);
  }

  protected onCustomerFocus(): void {
    const val = this.invoiceForm.get('customerName')?.value || '';
    this.searchQuery.set(val);
    this.showDropdown.set(true);
  }

  protected onCustomerBlur(): void {
    setTimeout(() => {
      this.showDropdown.set(false);
    }, 250);
  }

  protected async selectCustomer(customer: any): Promise<void> {
    this.billingType.set('customer');

    const mobileCtrl = this.invoiceForm.get('customerMobile');
    mobileCtrl?.setValidators([Validators.required, Validators.pattern(/^[0-9]{10}$/)]);
    mobileCtrl?.updateValueAndValidity();

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

    this.searchQuery.set(customer.customer_name);
    this.showDropdown.set(false);
  }

  protected selectBusinessContact(contact: any): void {
    this.billingType.set('business_contact');

    const mobileCtrl = this.invoiceForm.get('customerMobile');
    mobileCtrl?.setValidators([Validators.pattern(/^[0-9]{10}$/)]);
    mobileCtrl?.updateValueAndValidity();

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

    this.searchQuery.set(contact.name);
    this.showDropdown.set(false);
  }

  protected selectResult(item: any): void {
    if (item.type === 'customer') {
      this.selectCustomer(item.raw);
    } else {
      this.selectBusinessContact(item.raw);
    }
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
