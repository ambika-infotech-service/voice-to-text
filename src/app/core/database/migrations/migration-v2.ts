import { Migration } from '../types/database.types';

/**
 * Migration v2 defining the schema for customers and customer_workers.
 */
export const MigrationV2: Migration = {
  version: 2,
  statements: [
    `CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NULL,
      customer_name TEXT NOT NULL,
      mobile TEXT UNIQUE,
      email TEXT,
      gst_number TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (company_name IS NOT NULL OR customer_name IS NOT NULL)
    );`,
    `CREATE TABLE IF NOT EXISTS customer_workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      worker_name TEXT NOT NULL,
      mobile TEXT,
      designation TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );`,
    // Indexes to optimize performance on common joins and searches
    `CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(customer_name);`,
    `CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_name);`,
    `CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile);`,
    `CREATE INDEX IF NOT EXISTS idx_customer_workers_customer ON customer_workers(customer_id);`
  ]
};
