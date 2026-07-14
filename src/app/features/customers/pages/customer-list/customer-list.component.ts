import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../../../core/database/models/customer.model';
import { ConfirmationDialogService } from '../../../../core/ui/confirmation-dialog/confirmation-dialog.service';

/**
 * Page component rendering the list of customers.
 * Supports keyword search, custom sorting, and page-based pagination.
 */
@Component({
  selector: 'app-customer-list',
  imports: [RouterLink, FormsModule],
  templateUrl: './customer-list.component.html',
  styleUrl: './customer-list.component.scss'
})
export class CustomerListComponent implements OnInit {
  private readonly customerService = inject(CustomerService);
  private readonly confirmService = inject(ConfirmationDialogService);

  // Lists and stats states
  protected readonly customers = signal<Customer[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);

  // Filter/Pagination signal parameters
  protected readonly searchText = signal('');
  protected readonly sortBy = signal<'name' | 'recently_added'>('name');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);

  public ngOnInit(): void {
    this.fetchData();
  }

  /**
   * Refreshes the customers list based on current filters and pagination values.
   */
  protected async fetchData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const offset = (this.page() - 1) * this.pageSize();
      const res = await this.customerService.getCustomers({
        sortBy: this.sortBy(),
        search: this.searchText(),
        limit: this.pageSize(),
        offset
      });
      this.customers.set(res.customers);
      this.totalCount.set(res.totalCount);
    } catch (err) {
      console.error('Error fetching customers list:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Triggered on search text change. Resets to page 1.
   */
  protected onSearchChange(): void {
    this.page.set(1);
    this.fetchData();
  }

  /**
   * Triggered on sorting option change. Resets to page 1.
   */
  protected onSortChange(sort: 'name' | 'recently_added'): void {
    this.sortBy.set(sort);
    this.page.set(1);
    this.fetchData();
  }

  /**
   * Navigates to a specific page.
   */
  protected setPage(pageNo: number): void {
    if (pageNo < 1 || pageNo > this.totalPages()) return;
    this.page.set(pageNo);
    this.fetchData();
  }

  /**
   * Computed total page count.
   */
  protected totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize()) || 1;
  }

  /**
   * Confirms and deletes a customer from the database.
   */
  protected async deleteCustomer(customer: Customer): Promise<void> {
    if (!customer.id) return;
    
    const displayName = customer.company_name 
      ? `${customer.company_name} (${customer.customer_name})`
      : customer.customer_name;

    const confirmed = await this.confirmService.confirm({
      title: 'Delete Customer Profile',
      message: `Are you sure you want to delete the customer "${displayName}"?\nThis action will also delete all associated workers and cannot be undone.`,
      confirmText: 'Delete Customer',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      const success = await this.customerService.deleteCustomer(customer.id);
      if (success) {
        // If we deleted the last item on the page, roll back one page
        if (this.customers().length === 1 && this.page() > 1) {
          this.page.update(p => p - 1);
        }
        await this.fetchData();
      }
    }
  }
}
