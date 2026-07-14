import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../../../core/database/models/customer.model';
import { CustomerContact } from '../../../../core/database/models/customer-contact.model';
import { ToastService } from '../../../../core/ui/toast/toast.service';

/**
 * Group-level validator enforcing that either Company Name or Customer Name (or both) are filled.
 */
export const companyOrCustomerNameValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const companyName = control.get('company_name')?.value;
  const customerName = control.get('customer_name')?.value;

  if (!companyName?.trim() && !customerName?.trim()) {
    return { nameRequired: true };
  }
  return null;
};

/**
 * Component for adding and editing customer records.
 * Manages customer information fields and dynamic contact sub-forms in a single reactive FormGroup.
 */
@Component({
  selector: 'app-customer-form',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.scss'
})
export class CustomerFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly toast = inject(ToastService);

  // Form group definition
  protected customerForm!: FormGroup;

  // State configurations
  protected readonly isEditMode = signal(false);
  protected readonly customerId = signal<number | null>(null);
  protected readonly isSubmitting = signal(false);

  private readonly indianMobileRegex = '^([6-9]\\d{9})?$';
  private readonly gstinRegex = '^([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})?$';

  public ngOnInit(): void {
    this.initializeForm();
    this.checkRouteAndLoadData();
  }

  /**
   * Initializes the customer and contact subform controls with validation rules.
   */
  private initializeForm(): void {
    this.customerForm = this.fb.group({
      company_name: [''],
      customer_name: [''],
      mobile: ['', [Validators.pattern(this.indianMobileRegex)]],
      email: ['', [Validators.email]],
      gst_number: ['', [Validators.pattern(this.gstinRegex)]],
      address: [''],
      city: [''],
      state: [''],
      pincode: ['', [Validators.pattern('^(\\d{6})?$')]], // Indian pincode validation (6 digits)
      notes: [''],
      contacts: this.fb.array([])
    }, { validators: companyOrCustomerNameValidator });
  }

  /**
   * Helper returning the FormArray of contacts.
   */
  protected get contacts(): FormArray {
    return this.customerForm.get('contacts') as FormArray;
  }

  /**
   * Adds a new empty contact row to the dynamic contact FormArray.
   */
  protected addContact(contact?: CustomerContact): void {
    const contactGroup = this.fb.group({
      id: [contact?.id || null],
      contact_name: [contact?.contact_name || '', Validators.required],
      mobile: [contact?.mobile || '', [Validators.pattern(this.indianMobileRegex)]],
      designation: [contact?.designation || ''],
      notes: [contact?.notes || '']
    });
    this.contacts.push(contactGroup);
  }

  /**
   * Removes a contact row at the specified index.
   */
  protected removeContact(index: number): void {
    this.contacts.removeAt(index);
  }

  /**
   * Detects route params to fetch customer records in Edit mode.
   */
  private async checkRouteAndLoadData(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      if (!isNaN(id)) {
        this.isEditMode.set(true);
        this.customerId.set(id);
        await this.loadCustomerData(id);
      }
    }
  }

  /**
   * Loads customer and associated contacts into the form controls.
   */
  private async loadCustomerData(id: number): Promise<void> {
    try {
      const result = await this.customerService.getCustomerWithContacts(id);
      if (result) {
        const { customer, contacts } = result;

        this.customerForm.patchValue({
          company_name: customer.company_name || '',
          customer_name: customer.customer_name || '',
          mobile: customer.mobile || '',
          email: customer.email || '',
          gst_number: customer.gst_number || '',
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          pincode: customer.pincode || '',
          notes: customer.notes || ''
        });

        // Clear default empty array and populate database contact rows
        this.contacts.clear();
        for (const contact of contacts) {
          this.addContact(contact);
        }
      } else {
        this.toast.error('Customer profile not found in database.');
        this.router.navigate(['/customers']);
      }
    } catch (err) {
      console.error('Failed to load customer form details:', err);
    }
  }

  /**
   * Handles form submit. Saves the customer and contacts in a single database transaction block.
   */
  protected async onSubmit(): Promise<void> {
    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      this.toast.error('Please fix the validation errors in the form before saving.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const formValue = this.customerForm.value;
      const timestamp = new Date().toISOString();

      // Construct Customer object
      const customer: Customer = {
        id: this.isEditMode() ? this.customerId()! : undefined,
        company_name: formValue.company_name || null,
        customer_name: formValue.customer_name || '',
        mobile: formValue.mobile || null,
        email: formValue.email || null,
        gst_number: formValue.gst_number || null,
        address: formValue.address || null,
        city: formValue.city || null,
        state: formValue.state || null,
        pincode: formValue.pincode || null,
        notes: formValue.notes || null,
        created_at: timestamp,
        updated_at: timestamp
      };

      // Construct Contacts array
      const contactsList: CustomerContact[] = formValue.contacts.map((c: any) => ({
        id: c.id || undefined,
        customer_id: this.isEditMode() ? this.customerId()! : -1,
        contact_name: c.contact_name,
        mobile: c.mobile || null,
        designation: c.designation || null,
        notes: c.notes || null,
        created_at: timestamp,
        updated_at: timestamp
      }));

      if (this.isEditMode()) {
        await this.customerService.updateCustomerWithContacts({
          ...customer,
          created_at: undefined as any // DB updates will ignore created_at column in query anyway
        }, contactsList);
        this.router.navigate(['/customers', this.customerId()]);
      } else {
        const newId = await this.customerService.saveCustomerWithContacts(customer, contactsList);
        this.router.navigate(['/customers', newId]);
      }
    } catch (err: any) {
      console.error('Error submitting customer form:', err);
      // Special check for SQLite uniqueness violation
      if (err.message && err.message.includes('UNIQUE constraint failed: customers.mobile')) {
        this.toast.error('Save failed: The mobile number entered is already registered to another customer.');
      } else {
        this.toast.error('Failed to save customer. Please verify input fields.');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
