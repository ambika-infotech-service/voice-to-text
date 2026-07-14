import { Service, inject } from '@angular/core';
import { CustomerRepository } from '../../../core/database/repositories/customer.repository';
import { ToastService } from '../../../core/ui/toast/toast.service';
import { Customer } from '../../../core/database/models/customer.model';
import { CustomerContact } from '../../../core/database/models/customer-contact.model';

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
   * Fetches contacts of a customer.
   */
  public async getContactsByCustomer(customerId: number): Promise<CustomerContact[]> {
    try {
      return await this.customerRepo.getContactsByCustomer(customerId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to load contacts: ${msg}`);
      return [];
    }
  }

  /**
   * Reusable API fetching customer along with all their contacts.
   */
  public async getCustomerWithContacts(id: number): Promise<{ customer: Customer; contacts: CustomerContact[] } | null> {
    try {
      return await this.customerRepo.getCustomerWithContacts(id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to load customer with contacts: ${msg}`);
      return null;
    }
  }

  /**
   * Creates a new customer with a list of contacts in a single transaction.
   */
  public async saveCustomerWithContacts(customer: Customer, contacts: CustomerContact[]): Promise<number> {
    try {
      const customerId = await this.customerRepo.saveCustomerWithContacts(customer, contacts);
      this.toast.success('Customer and contact records created successfully.');
      return customerId;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to save customer details: ${msg}`);
      throw err;
    }
  }

  /**
   * Updates an existing customer and maps contact updates/deletes in a single transaction.
   */
  public async updateCustomerWithContacts(customer: Customer, contacts: CustomerContact[]): Promise<void> {
    try {
      await this.customerRepo.updateCustomerWithContacts(customer, contacts);
      this.toast.success('Customer and contact records updated successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to update customer details: ${msg}`);
      throw err;
    }
  }

  /**
   * Registers a single contact associated with a customer.
   */
  public async createCustomerContact(contact: CustomerContact): Promise<number> {
    try {
      const id = await this.customerRepo.createCustomerContact(contact);
      this.toast.success('Customer contact registered successfully.');
      return id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to register customer contact: ${msg}`);
      throw err;
    }
  }

  /**
   * Deletes a customer. Cascade delete removes associated contacts in database.
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
   * Reusable contact search utility.
   */
  public async searchCustomerContact(query: string): Promise<CustomerContact[]> {
    try {
      return await this.customerRepo.searchCustomerContacts(query);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Customer contact search failed: ${msg}`);
      return [];
    }
  }
}
