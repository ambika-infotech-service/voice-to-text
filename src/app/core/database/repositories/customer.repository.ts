import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database';
import { Customer } from '../models/customer.model';
import { CustomerWorker } from '../models/customer-worker.model';

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
 * Repository handling SQLite database operations for the customers and customer_workers tables.
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
   * Deletes a customer by ID. Due to CASCADE constraint, associated workers are auto-deleted.
   * @param id The customer ID.
   */
  public async deleteCustomer(id: number): Promise<void> {
    const sql = `DELETE FROM customers WHERE id = ?;`;
    await this.db.run(sql, [id]);
  }

  /**
   * Retrieves a single customer record by ID, including its worker count.
   * @param id The customer ID.
   * @returns The Customer object or null if not found.
   */
  public async getCustomer(id: number): Promise<Customer | null> {
    const sql = `
      SELECT c.*, (SELECT COUNT(*) FROM customer_workers cw WHERE cw.customer_id = c.id) as worker_count
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
      SELECT c.*, (SELECT COUNT(*) FROM customer_workers cw WHERE cw.customer_id = c.id) as worker_count
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
      SELECT c.*, (SELECT COUNT(*) FROM customer_workers cw WHERE cw.customer_id = c.id) as worker_count,
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

    // Bind parameters:
    // Exact: 4 params (company_name, customer_name, mobile, gst_number)
    // Starts-with: 4 params
    // Contains: 4 params
    const params = [
      exact, exact, exact, exact, // exact match
      startsWith, startsWith, startsWith, startsWith, // starts with match
      contains, contains, contains, contains // contains match
    ];

    return this.db.query<Customer>(sql, params);
  }

  /**
   * Inserts a new worker record for a customer.
   * @param worker The CustomerWorker object to insert.
   * @returns The generated database primary key ID.
   */
  public async createWorker(worker: CustomerWorker): Promise<number> {
    const sql = `
      INSERT INTO customer_workers (
        customer_id, worker_name, mobile, designation, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?);
    `;
    const res = await this.db.run(sql, [
      worker.customer_id,
      worker.worker_name.trim(),
      normalizeMobile(worker.mobile),
      worker.designation?.trim() || null,
      worker.notes?.trim() || null,
      worker.created_at,
      worker.updated_at
    ]);
    return res.lastId ?? -1;
  }

  /**
   * Updates an existing worker record.
   * @param worker The CustomerWorker object containing updated fields.
   */
  public async updateWorker(worker: CustomerWorker): Promise<void> {
    if (worker.id === undefined) {
      throw new Error('Worker ID must be defined for updates.');
    }
    const sql = `
      UPDATE customer_workers SET
        worker_name = ?,
        mobile = ?,
        designation = ?,
        notes = ?,
        updated_at = ?
      WHERE id = ?;
    `;
    await this.db.run(sql, [
      worker.worker_name.trim(),
      normalizeMobile(worker.mobile),
      worker.designation?.trim() || null,
      worker.notes?.trim() || null,
      worker.updated_at,
      worker.id
    ]);
  }

  /**
   * Deletes a worker record by ID.
   * @param id The worker ID.
   */
  public async deleteWorker(id: number): Promise<void> {
    const sql = `DELETE FROM customer_workers WHERE id = ?;`;
    await this.db.run(sql, [id]);
  }

  /**
   * Fetches all workers associated with a customer.
   * @param customerId The parent customer ID.
   */
  public async getWorkersByCustomer(customerId: number): Promise<CustomerWorker[]> {
    const sql = `SELECT * FROM customer_workers WHERE customer_id = ? ORDER BY worker_name ASC;`;
    return this.db.query<CustomerWorker>(sql, [customerId]);
  }

  /**
   * Saves a customer and their workers inside a single database transaction block.
   * @param customer The Customer object (new).
   * @param workers The list of workers to insert.
   */
  public async saveCustomerWithWorkers(customer: Customer, workers: CustomerWorker[]): Promise<number> {
    let customerId = -1;
    await this.db.runTransaction(async () => {
      customerId = await this.createCustomer(customer);
      if (customerId === -1) {
        throw new Error('Failed to create customer record inside transaction.');
      }
      for (const worker of workers) {
        const workerToSave: CustomerWorker = {
          ...worker,
          customer_id: customerId
        };
        await this.createWorker(workerToSave);
      }
    });
    return customerId;
  }

  /**
   * Updates a customer and synchronizes their workers list inside a single database transaction.
   * Resolves inserts, updates, and deletes of worker records.
   * @param customer The updated Customer object.
   * @param workers The updated workers array.
   */
  public async updateCustomerWithWorkers(customer: Customer, workers: CustomerWorker[]): Promise<void> {
    if (customer.id === undefined) {
      throw new Error('Customer ID must be defined for updates.');
    }

    await this.db.runTransaction(async () => {
      // 1. Update customer profile
      await this.updateCustomer(customer);

      const customerId = customer.id!;
      // 2. Fetch existing workers from database
      const existingWorkers = await this.getWorkersByCustomer(customerId);
      const existingIds = existingWorkers.map(w => w.id!).filter(id => id !== undefined);

      // Identify incoming IDs
      const incomingIds = workers.map(w => w.id!).filter(id => id !== undefined);

      // 3. Workers to delete (in existing but not in incoming)
      const idsToDelete = existingIds.filter(id => !incomingIds.includes(id));
      for (const deleteId of idsToDelete) {
        await this.deleteWorker(deleteId);
      }

      // 4. Insert or Update incoming workers
      for (const worker of workers) {
        if (worker.id !== undefined && existingIds.includes(worker.id)) {
          // Exists -> Update
          await this.updateWorker(worker);
        } else {
          // New -> Insert
          const newWorker: CustomerWorker = {
            ...worker,
            customer_id: customerId
          };
          await this.createWorker(newWorker);
        }
      }
    });
  }

  /**
   * Reusable API to search workers across all customers by worker_name or mobile.
   * Useful for invoice generation integration.
   * @param query Search keywords/term.
   */
  public async searchWorkers(query: string): Promise<Array<CustomerWorker & { parent_customer_name: string; parent_company_name: string | null }>> {
    const trimmed = query.trim();
    if (trimmed === '') {
      return [];
    }
    const sql = `
      SELECT cw.*, c.customer_name as parent_customer_name, c.company_name as parent_company_name
      FROM customer_workers cw
      JOIN customers c ON cw.customer_id = c.id
      WHERE cw.worker_name LIKE ? OR cw.mobile LIKE ?
      ORDER BY cw.worker_name ASC;
    `;
    const term = `%${trimmed}%`;
    return this.db.query<any>(sql, [term, term]);
  }

  /**
   * Reusable API to fetch a customer along with all their workers.
   * Useful for invoice billing integration.
   * @param id Customer ID.
   */
  public async getCustomerWithWorkers(id: number): Promise<{ customer: Customer; workers: CustomerWorker[] } | null> {
    const customer = await this.getCustomer(id);
    if (!customer) {
      return null;
    }
    const workers = await this.getWorkersByCustomer(id);
    return { customer, workers };
  }
}
