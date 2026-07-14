import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../../../core/database/models/customer.model';
import { CustomerWorker } from '../../../../core/database/models/customer-worker.model';
import { ConfirmationDialogService } from '../../../../core/ui/confirmation-dialog/confirmation-dialog.service';
import { ToastService } from '../../../../core/ui/toast/toast.service';

/**
 * Component displaying full profiles of a customer and lists associated workers.
 * Features inline quick-adding of individual workers.
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
  protected readonly workers = signal<CustomerWorker[]>([]);
  protected readonly isLoading = signal(true);

  // Quick Add Worker Form
  protected quickWorkerForm!: FormGroup;
  protected readonly isAddingWorker = signal(false);
  protected readonly isShowQuickAdd = signal(false);

  private readonly indianMobileRegex = '^([6-9]\\d{9})?$';

  public ngOnInit(): void {
    this.initializeQuickWorkerForm();
    this.loadCustomerDetails();
  }

  /**
   * Initializes the quick add worker reactive form controls.
   */
  private initializeQuickWorkerForm(): void {
    this.quickWorkerForm = this.fb.group({
      worker_name: ['', Validators.required],
      mobile: ['', [Validators.pattern(this.indianMobileRegex)]],
      designation: [''],
      notes: ['']
    });
  }

  /**
   * Fetches customer profile details and its associated workers.
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
      const result = await this.customerService.getCustomerWithWorkers(id);
      if (result) {
        this.customer.set(result.customer);
        this.workers.set(result.workers);
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
   * Toggles the inline quick add worker form.
   */
  protected toggleQuickAdd(): void {
    this.isShowQuickAdd.update(val => !val);
    if (!this.isShowQuickAdd()) {
      this.quickWorkerForm.reset();
    }
  }

  /**
   * Submits the quick add worker form. Inserts worker record directly to database.
   */
  protected async onQuickAddWorker(): Promise<void> {
    if (this.quickWorkerForm.invalid) {
      this.quickWorkerForm.markAllAsTouched();
      this.toast.error('Please enter a valid Worker Name.');
      return;
    }

    const customerVal = this.customer();
    if (!customerVal || !customerVal.id) return;

    this.isAddingWorker.set(true);
    try {
      const formValue = this.quickWorkerForm.value;
      const timestamp = new Date().toISOString();

      const worker: CustomerWorker = {
        customer_id: customerVal.id,
        worker_name: formValue.worker_name.trim(),
        mobile: formValue.mobile || null,
        designation: formValue.designation || null,
        notes: formValue.notes || null,
        created_at: timestamp,
        updated_at: timestamp
      };

      // Direct save to DB via Service
      await this.customerService.createWorker(worker);

      this.quickWorkerForm.reset();
      this.isShowQuickAdd.set(false);
      
      // Refresh list
      await this.loadCustomerDetails();
    } catch (err) {
      console.error('Failed to add worker quickly:', err);
    } finally {
      this.isAddingWorker.set(false);
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
      message: `Are you sure you want to delete the customer "${displayName}"?\nAll associated worker records will be permanently removed. This action is irreversible.`,
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
