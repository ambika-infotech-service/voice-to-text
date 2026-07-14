import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../../../core/database/models/customer.model';
import { CustomerContact } from '../../../../core/database/models/customer-contact.model';
import { ConfirmationDialogService } from '../../../../core/ui/confirmation-dialog/confirmation-dialog.service';
import { ToastService } from '../../../../core/ui/toast/toast.service';

/**
 * Component displaying full profiles of a customer and lists associated contacts.
 * Features inline quick-adding of individual contacts.
 */
@Component({
  selector: 'app-customer-details',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './customer-details.component.html',
  styleUrl: './customer-details.component.scss'
})
export class CustomerDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);
  private readonly confirmService = inject(ConfirmationDialogService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  // States
  protected readonly customer = signal<Customer | null>(null);
  protected readonly contacts = signal<CustomerContact[]>([]);
  protected readonly isLoading = signal(true);

  // Quick Add Contact Form
  protected quickContactForm!: FormGroup;
  protected readonly isAddingContact = signal(false);
  protected readonly isShowQuickAdd = signal(false);

  private readonly indianMobileRegex = '^([6-9]\\d{9})?$';

  public ngOnInit(): void {
    this.initializeQuickContactForm();
    this.loadCustomerDetails();
  }

  /**
   * Initializes the quick add contact reactive form controls.
   */
  private initializeQuickContactForm(): void {
    this.quickContactForm = this.fb.group({
      contact_name: ['', Validators.required],
      mobile: ['', [Validators.pattern(this.indianMobileRegex)]],
      designation: [''],
      notes: ['']
    });
  }

  /**
   * Fetches customer profile details and its associated contacts.
   */
  protected async loadCustomerDetails(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.toast.error('Invalid URL parameters.');
      this.router.navigate(['/customers']);
      return;
    }

    const id = Number(idParam);
    if (isNaN(id)) {
      this.toast.error('Invalid Customer ID.');
      this.router.navigate(['/customers']);
      return;
    }

    this.isLoading.set(true);
    try {
      const result = await this.customerService.getCustomerWithContacts(id);
      if (result) {
        this.customer.set(result.customer);
        this.contacts.set(result.contacts);
      } else {
        this.toast.error('Customer profile not found.');
        this.router.navigate(['/customers']);
      }
    } catch (err) {
      console.error('Error loading customer details:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Toggles the inline quick add contact form.
   */
  protected toggleQuickAdd(): void {
    this.isShowQuickAdd.update(val => !val);
    if (!this.isShowQuickAdd()) {
      this.quickContactForm.reset();
    }
  }

  /**
   * Submits the quick add contact form. Inserts contact record directly to database.
   */
  protected async onQuickAddContact(): Promise<void> {
    if (this.quickContactForm.invalid) {
      this.quickContactForm.markAllAsTouched();
      this.toast.error('Please enter a valid Contact Name.');
      return;
    }

    const customerVal = this.customer();
    if (!customerVal || !customerVal.id) return;

    this.isAddingContact.set(true);
    try {
      const formValue = this.quickContactForm.value;
      const timestamp = new Date().toISOString();

      const contact: CustomerContact = {
        customer_id: customerVal.id,
        contact_name: formValue.contact_name.trim(),
        mobile: formValue.mobile || null,
        designation: formValue.designation || null,
        notes: formValue.notes || null,
        created_at: timestamp,
        updated_at: timestamp
      };

      // Direct save to DB via Service
      await this.customerService.createCustomerContact(contact);

      this.quickContactForm.reset();
      this.isShowQuickAdd.set(false);
      
      // Refresh list
      await this.loadCustomerDetails();
    } catch (err) {
      console.error('Failed to add contact quickly:', err);
    } finally {
      this.isAddingContact.set(false);
    }
  }

  /**
   * Confirms and deletes the active customer record.
   */
  protected async deleteCustomer(): Promise<void> {
    const customerVal = this.customer();
    if (!customerVal || !customerVal.id) return;

    const displayName = customerVal.company_name 
      ? `${customerVal.company_name} (${customerVal.customer_name})`
      : customerVal.customer_name;

    const confirmed = await this.confirmService.confirm({
      title: 'Delete Customer Profile',
      message: `Are you sure you want to delete the customer "${displayName}"?\nAll associated contact records will be permanently removed. This action is irreversible.`,
      confirmText: 'Delete Profile',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      const success = await this.customerService.deleteCustomer(customerVal.id);
      if (success) {
        this.router.navigate(['/customers']);
      }
    }
  }
}
