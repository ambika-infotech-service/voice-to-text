import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database';
import { Customer } from '../models/customer.model';
import { CustomerContact } from '../models/customer-contact.model';

/**
 * Helper to normalize mobile fields: empty strings or whitespace are written as null
 * to prevent SQLite UNIQUE constraint collisions for optional mobile numbers.
 */
function normalizeMobile(m?: string | null): string | null {
  if (!m) return null;
  const trimmed = m.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Repository handling SQLite database operations for the customers and customer_contacts tables.
 */
@Service()
export class CustomerRepository {
  private readonly db = inject(DatabaseService);

  /**
   * Inserts a new customer record.
   * @param customer The Customer object to insert.
   * @returns The generated database primary key ID.
   */
  public async createCustomer(customer: Customer): Promise<number> {
    const sql = `
      INSERT INTO customers (
        company_name, customer_name, mobile, email, gst_number,
        address, city, state, pincode, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const res = await this.db.run(sql, [
      customer.company_name?.trim() || null,
      customer.customer_name.trim(),
      normalizeMobile(customer.mobile),
      customer.email?.trim() || null,
      customer.gst_number?.toUpperCase().trim() || null,
      customer.address?.trim() || null,
      customer.city?.trim() || null,
      customer.state?.trim() || null,
      customer.pincode?.trim() || null,
      customer.notes?.trim() || null,
      customer.created_at,
      customer.updated_at
    ]);
    return res.lastId ?? -1;
  }

  /**
   * Updates an existing customer record.
   * @param customer The Customer object containing the updated fields and ID.
   */
  public async updateCustomer(customer: Customer): Promise<void> {
    if (customer.id === undefined) {
      throw new Error('Customer ID must be defined for updates.');
    }
    const sql = `
      UPDATE customers SET
        company_name = ?,
        customer_name = ?,
        mobile = ?,
        email = ?,
        gst_number = ?,
        address = ?,
        city = ?,
        state = ?,
        pincode = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?;
    `;
    await this.db.run(sql, [
      customer.company_name?.trim() || null,
      customer.customer_name.trim(),
      normalizeMobile(customer.mobile),
      customer.email?.trim() || null,
      customer.gst_number?.toUpperCase().trim() || null,
      customer.address?.trim() || null,
      customer.city?.trim() || null,
      customer.state?.trim() || null,
      customer.pincode?.trim() || null,
      customer.notes?.trim() || null,
      customer.updated_at,
      customer.id
    ]);
  }

  /**
   * Deletes a customer by ID. Due to CASCADE constraint, associated contacts are auto-deleted.
   * @param id The customer ID.
   */
  public async deleteCustomer(id: number): Promise<void> {
    const sql = `DELETE FROM customers WHERE id = ?;`;
    await this.db.run(sql, [id]);
  }

  /**
   * Retrieves a single customer record by ID, including its contact count.
   * @param id The customer ID.
   * @returns The Customer object or null if not found.
   */
  public async getCustomer(id: number): Promise<Customer | null> {
    const sql = `
      SELECT c.*, (SELECT COUNT(*) FROM customer_contacts cc WHERE cc.customer_id = c.id) as contact_count
      FROM customers c
      WHERE c.id = ? LIMIT 1;
    `;
    const rows = await this.db.query<Customer>(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Fetches, sorts, and paginates the list of customers.
   * @param options Sorting, searching, and pagination config.
   * @returns Array of Customer objects and total count.
   */
  public async getCustomers(options: {
    sortBy?: 'name' | 'recently_added';
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ customers: Customer[]; totalCount: number }> {
    const { sortBy = 'name', search = '', limit = 10, offset = 0 } = options;

    let whereClause = '';
    const params: unknown[] = [];

    if (search.trim() !== '') {
      const term = `%${search.trim()}%`;
      whereClause = `
        WHERE company_name LIKE ?
           OR customer_name LIKE ?
           OR mobile LIKE ?
           OR gst_number LIKE ?
      `;
      params.push(term, term, term, term);
    }

    // Sort order: name (alphabetical sorting of customer_name or company_name)
    // recently_added (newest created_at first)
    const orderClause = sortBy === 'name'
      ? 'ORDER BY LOWER(COALESCE(NULLIF(company_name, ""), customer_name)) ASC'
      : 'ORDER BY created_at DESC, id DESC';

    // Query total count
    const countSql = `SELECT COUNT(*) as count FROM customers ${whereClause};`;
    const countRows = await this.db.query<{ count: number }>(countSql, params);
    const totalCount = countRows[0]?.count ?? 0;

    // Fetch paginated page items
    const querySql = `
      SELECT c.*, (SELECT COUNT(*) FROM customer_contacts cc WHERE cc.customer_id = c.id) as contact_count
      FROM customers c
      ${whereClause}
      ${orderClause}
      LIMIT ? OFFSET ?;
    `;
    const customers = await this.db.query<Customer>(querySql, [...params, limit, offset]);

    return { customers, totalCount };
  }

  /**
   * Optimized search returning customer profiles prioritized by matching type:
   * 1. Exact match (Priority 1)
   * 2. Starts-with match (Priority 2)
   * 3. Contains match (Priority 3)
   * @param query Search query text.
   * @returns Ranked array of Customer objects.
   */
  public async searchCustomers(query: string): Promise<Customer[]> {
    const trimmed = query.trim();
    if (trimmed === '') {
      return [];
    }

    const exact = trimmed;
    const startsWith = `${trimmed}%`;
    const contains = `%${trimmed}%`;

    const sql = `
      SELECT c.*, (SELECT COUNT(*) FROM customer_contacts cc WHERE cc.customer_id = c.id) as contact_count,
        CASE
          WHEN LOWER(c.company_name) = LOWER(?) OR LOWER(c.customer_name) = LOWER(?) OR c.mobile = ? OR LOWER(c.gst_number) = LOWER(?) THEN 1
          WHEN c.company_name LIKE ? OR c.customer_name LIKE ? OR c.mobile LIKE ? OR c.gst_number LIKE ? THEN 2
          ELSE 3
        END as match_priority
      FROM customers c
      WHERE c.company_name LIKE ?
         OR c.customer_name LIKE ?
         OR c.mobile LIKE ?
         OR c.gst_number LIKE ?
      ORDER BY match_priority ASC, LOWER(COALESCE(NULLIF(c.company_name, ""), c.customer_name)) ASC;
    `;

    const params = [
      exact, exact, exact, exact, // exact match
      startsWith, startsWith, startsWith, startsWith, // starts with match
      contains, contains, contains, contains // contains match
    ];

    return this.db.query<Customer>(sql, params);
  }

  /**
   * Inserts a new customer contact record.
   * @param contact The CustomerContact object to insert.
   * @returns The generated database primary key ID.
   */
  public async createCustomerContact(contact: CustomerContact): Promise<number> {
    const sql = `
      INSERT INTO customer_contacts (
        customer_id, contact_name, mobile, designation, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    const res = await this.db.run(sql, [
      contact.customer_id,
      contact.contact_name.trim(),
      normalizeMobile(contact.mobile),
      contact.designation?.trim() || null,
      contact.notes?.trim() || null,
      contact.created_at,
      contact.updated_at
    ]);
    return res.lastId ?? -1;
  }

  /**
   * Updates an existing customer contact record.
   * @param contact The CustomerContact object containing updated fields.
   */
  public async updateCustomerContact(contact: CustomerContact): Promise<void> {
    if (contact.id === undefined) {
      throw new Error('Contact ID must be defined for updates.');
    }
    const sql = `
      UPDATE customer_contacts SET
        contact_name = ?,
        mobile = ?,
        designation = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?;
    `;
    await this.db.run(sql, [
      contact.contact_name.trim(),
      normalizeMobile(contact.mobile),
      contact.designation?.trim() || null,
      contact.notes?.trim() || null,
      contact.updated_at,
      contact.id
    ]);
  }

  /**
   * Deletes a customer contact record by ID.
   * @param id The contact ID.
   */
  public async deleteCustomerContact(id: number): Promise<void> {
    const sql = `DELETE FROM customer_contacts WHERE id = ?;`;
    await this.db.run(sql, [id]);
  }

  /**
   * Fetches all contacts associated with a customer.
   * @param customerId The parent customer ID.
   */
  public async getContactsByCustomer(customerId: number): Promise<CustomerContact[]> {
    const sql = `SELECT * FROM customer_contacts WHERE customer_id = ? ORDER BY contact_name ASC;`;
    return this.db.query<CustomerContact>(sql, [customerId]);
  }

  /**
   * Saves a customer and their contacts inside a single database transaction block.
   * @param customer The Customer object (new).
   * @param contacts The list of contacts to insert.
   */
  public async saveCustomerWithContacts(customer: Customer, contacts: CustomerContact[]): Promise<number> {
    let customerId = -1;
    await this.db.runTransaction(async () => {
      customerId = await this.createCustomer(customer);
      if (customerId === -1) {
        throw new Error('Failed to create customer record inside transaction.');
      }
      for (const contact of contacts) {
        const contactToSave: CustomerContact = {
          ...contact,
          customer_id: customerId
        };
        await this.createCustomerContact(contactToSave);
      }
    });
    return customerId;
  }

  /**
   * Updates a customer and synchronizes their contacts list inside a single database transaction.
   * Resolves inserts, updates, and deletes of contact records.
   * @param customer The updated Customer object.
   * @param contacts The updated contacts array.
   */
  public async updateCustomerWithContacts(customer: Customer, contacts: CustomerContact[]): Promise<void> {
    if (customer.id === undefined) {
      throw new Error('Customer ID must be defined for updates.');
    }

    await this.db.runTransaction(async () => {
      // 1. Update customer profile
      await this.updateCustomer(customer);

      const customerId = customer.id!;
      // 2. Fetch existing contacts from database
      const existingContacts = await this.getContactsByCustomer(customerId);
      const existingIds = existingContacts.map(c => c.id!).filter(id => id !== undefined);

      // Identify incoming IDs
      const incomingIds = contacts.map(c => c.id!).filter(id => id !== undefined);

      // 3. Contacts to delete (in existing but not in incoming)
      const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
      for (const deleteId of idsToDelete) {
        await this.deleteCustomerContact(deleteId);
      }

      // 4. Insert or Update incoming contacts
      for (const contact of contacts) {
        if (contact.id !== undefined && existingIds.includes(contact.id)) {
          // Exists -> Update
          await this.updateCustomerContact(contact);
        } else {
          // New -> Insert
          const newContact: CustomerContact = {
            ...contact,
            customer_id: customerId
          };
          await this.createCustomerContact(newContact);
        }
      }
    });
  }

  /**
   * Reusable API to search contacts across all customers by contact_name or mobile.
   * Useful for invoice generation integration.
   * @param query Search keywords/term.
   */
  public async searchCustomerContacts(query: string): Promise<Array<CustomerContact & { parent_customer_name: string; parent_company_name: string | null }>> {
    const trimmed = query.trim();
    if (trimmed === '') {
      return [];
    }
    const sql = `
      SELECT cc.*, c.customer_name as parent_customer_name, c.company_name as parent_company_name
      FROM customer_contacts cc
      JOIN customers c ON cc.customer_id = c.id
      WHERE cc.contact_name LIKE ? OR cc.mobile LIKE ?
      ORDER BY cc.contact_name ASC;
    `;
    const term = `%${trimmed}%`;
    return this.db.query<any>(sql, [term, term]);
  }

  /**
   * Reusable API to fetch a customer along with all their contacts.
   * Useful for invoice billing integration.
   * @param id Customer ID.
   */
  public async getCustomerWithContacts(id: number): Promise<{ customer: Customer; contacts: CustomerContact[] } | null> {
    const customer = await this.getCustomer(id);
    if (!customer) {
      return null;
    }
    const contacts = await this.getContactsByCustomer(id);
    return { customer, contacts };
  }
}
