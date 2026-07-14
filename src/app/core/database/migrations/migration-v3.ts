import { Migration } from '../types/database.types';

/**
 * Migration v3 defining the schema for business_contacts, contact_roles,
 * and business_contact_role_map, and renaming customer_workers to customer_contacts.
 */
export const MigrationV3: Migration = {
  version: 3,
  statements: [
    // 1. Rename customer_workers to customer_contacts
    `ALTER TABLE customer_workers RENAME TO customer_contacts;`,
    `ALTER TABLE customer_contacts RENAME COLUMN worker_name TO contact_name;`,
    `DROP INDEX IF EXISTS idx_customer_workers_customer;`,
    `CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts(customer_id);`,

    // 2. Create contact_roles table
    `CREATE TABLE IF NOT EXISTS contact_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_name TEXT NOT NULL UNIQUE,
      display_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    // 3. Create business_contacts table
    `CREATE TABLE IF NOT EXISTS business_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      mobile TEXT,
      alternate_mobile TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pincode TEXT,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,

    // 4. Create business_contact_role_map junction table
    `CREATE TABLE IF NOT EXISTS business_contact_role_map (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER NOT NULL,
      role_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(contact_id) REFERENCES business_contacts(id) ON DELETE CASCADE,
      FOREIGN KEY(role_id) REFERENCES contact_roles(id) ON DELETE CASCADE,
      UNIQUE(contact_id, role_id)
    );`,

    // 5. Seed initial contact roles
    `INSERT OR IGNORE INTO contact_roles (role_name, display_order, is_active, created_at, updated_at) VALUES ('Plumber', 1, 1, '2026-07-14T12:00:00Z', '2026-07-14T12:00:00Z');`,
    `INSERT OR IGNORE INTO contact_roles (role_name, display_order, is_active, created_at, updated_at) VALUES ('Electrician', 2, 1, '2026-07-14T12:00:00Z', '2026-07-14T12:00:00Z');`,
    `INSERT OR IGNORE INTO contact_roles (role_name, display_order, is_active, created_at, updated_at) VALUES ('Carpenter', 3, 1, '2026-07-14T12:00:00Z', '2026-07-14T12:00:00Z');`,
    `INSERT OR IGNORE INTO contact_roles (role_name, display_order, is_active, created_at, updated_at) VALUES ('Mason', 4, 1, '2026-07-14T12:00:00Z', '2026-07-14T12:00:00Z');`,
    `INSERT OR IGNORE INTO contact_roles (role_name, display_order, is_active, created_at, updated_at) VALUES ('Painter', 5, 1, '2026-07-14T12:00:00Z', '2026-07-14T12:00:00Z');`,
    `INSERT OR IGNORE INTO contact_roles (role_name, display_order, is_active, created_at, updated_at) VALUES ('Fabricator', 6, 1, '2026-07-14T12:00:00Z', '2026-07-14T12:00:00Z');`,
    `INSERT OR IGNORE INTO contact_roles (role_name, display_order, is_active, created_at, updated_at) VALUES ('Welder', 7, 1, '2026-07-14T12:00:00Z', '2026-07-14T12:00:00Z');`,
    `INSERT OR IGNORE INTO contact_roles (role_name, display_order, is_active, created_at, updated_at) VALUES ('Contractor', 8, 1, '2026-07-14T12:00:00Z', '2026-07-14T12:00:00Z');`,
    `INSERT OR IGNORE INTO contact_roles (role_name, display_order, is_active, created_at, updated_at) VALUES ('Interior Designer', 9, 1, '2026-07-14T12:00:00Z', '2026-07-14T12:00:00Z');`,
    `INSERT OR IGNORE INTO contact_roles (role_name, display_order, is_active, created_at, updated_at) VALUES ('Architect', 10, 1, '2026-07-14T12:00:00Z', '2026-07-14T12:00:00Z');`,
    `INSERT OR IGNORE INTO contact_roles (role_name, display_order, is_active, created_at, updated_at) VALUES ('Technician', 11, 1, '2026-07-14T12:00:00Z', '2026-07-14T12:00:00Z');`,
    `INSERT OR IGNORE INTO contact_roles (role_name, display_order, is_active, created_at, updated_at) VALUES ('Mechanic', 12, 1, '2026-07-14T12:00:00Z', '2026-07-14T12:00:00Z');`
  ]
};
