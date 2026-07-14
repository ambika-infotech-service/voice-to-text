import { Service, inject } from '@angular/core';
import { CustomerRepository } from '../../../core/database/repositories/customer.repository';
import { ToastService } from '../../../core/ui/toast/toast.service';
import { Customer } from '../../../core/database/models/customer.model';
import { CustomerWorker } from '../../../core/database/models/customer-worker.model';

/**
 * Service managing customer business logic operations, bridging the UI with the repository.
 * Employs ToastService notifications for visual feedback on write successes and read failures.
 */
@Service()
export class CustomerService {
  private readonly customerRepo = inject(CustomerRepository);
  private readonly toast = inject(ToastService);

  /**
   * Fetches paginated customers list, sorted and filtered.
   */
  public async getCustomers(options: {
    sortBy?: 'name' | 'recently_added';
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ customers: Customer[]; totalCount: number }> {
    try {
      return await this.customerRepo.getCustomers(options);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to fetch customers: ${msg}`);
      throw err;
    }
  }

  /**
   * Fetches a single customer by ID.
   */
  public async getCustomer(id: number): Promise<Customer | null> {
    try {
      return await this.customerRepo.getCustomer(id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to load customer: ${msg}`);
      return null;
    }
  }

  /**
   * Fetches workers of a customer.
   */
  public async getWorkersByCustomer(customerId: number): Promise<CustomerWorker[]> {
    try {
      return await this.customerRepo.getWorkersByCustomer(customerId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to load workers: ${msg}`);
      return [];
    }
  }

  /**
   * Reusable API fetching customer along with all their workers.
   */
  public async getCustomerWithWorkers(id: number): Promise<{ customer: Customer; workers: CustomerWorker[] } | null> {
    try {
      return await this.customerRepo.getCustomerWithWorkers(id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to load customer with workers: ${msg}`);
      return null;
    }
  }

  /**
   * Creates a new customer with a list of workers in a single transaction.
   */
  public async saveCustomerWithWorkers(customer: Customer, workers: CustomerWorker[]): Promise<number> {
    try {
      const customerId = await this.customerRepo.saveCustomerWithWorkers(customer, workers);
      this.toast.success('Customer and worker records created successfully.');
      return customerId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to save customer details: ${msg}`);
      throw err;
    }
  }

  /**
   * Updates an existing customer and maps worker updates/deletes in a single transaction.
   */
  public async updateCustomerWithWorkers(customer: Customer, workers: CustomerWorker[]): Promise<void> {
    try {
      await this.customerRepo.updateCustomerWithWorkers(customer, workers);
      this.toast.success('Customer and worker records updated successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to update customer details: ${msg}`);
      throw err;
    }
  }

  /**
   * Registers a single worker associated with a customer.
   */
  public async createWorker(worker: CustomerWorker): Promise<number> {
    try {
      const id = await this.customerRepo.createWorker(worker);
      this.toast.success('Worker contact registered successfully.');
      return id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to register worker contact: ${msg}`);
      throw err;
    }
  }

  /**
   * Deletes a customer. Cascade delete removes associated workers in database.
   */
  public async deleteCustomer(id: number): Promise<boolean> {
    try {
      await this.customerRepo.deleteCustomer(id);
      this.toast.success('Customer profile deleted successfully.');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to delete customer: ${msg}`);
      return false;
    }
  }

  /**
   * Reusable customer search utility (Exact -> Starts-with -> Contains match priority).
   */
  public async searchCustomer(query: string): Promise<Customer[]> {
    try {
      return await this.customerRepo.searchCustomers(query);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Customer search failed: ${msg}`);
      return [];
    }
  }

  /**
   * Reusable worker search utility.
   */
  public async searchWorker(query: string): Promise<CustomerWorker[]> {
    try {
      return await this.customerRepo.searchWorkers(query);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Worker search failed: ${msg}`);
      return [];
    }
  }
}
