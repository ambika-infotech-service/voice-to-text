import { Migration } from '../types/database.types';

/**
 * Migration v5 defining demo seed data for customers, customer_contacts,
 * and business_contacts with role mappings.
 */
export const MigrationV5: Migration = {
  version: 5,
  statements: [
    // 1. Seed customers
    `INSERT OR IGNORE INTO customers (id, company_name, customer_name, mobile, email, gst_number, address, city, state, pincode, notes, created_at, updated_at)
     VALUES (1, 'Shree Ram Developers', 'Rajesh Patel', '9876543210', 'patel@shreeram.com', '24AAAAS1234A1Z1', '101, Business Hub, CG Road', 'Ahmedabad', 'Gujarat', '380009', 'A-grade contractor', '2026-07-15T00:00:00Z', '2026-07-15T00:00:00Z');`,
    `INSERT OR IGNORE INTO customers (id, company_name, customer_name, mobile, email, gst_number, address, city, state, pincode, notes, created_at, updated_at)
     VALUES (2, 'Ambika Enterprises', 'Amit Sharma', '9123456789', 'amit@ambika.com', NULL, 'Pritam Nagar, Akhbar Nagar', 'Ahmedabad', 'Gujarat', '380013', 'Frequent buyer, cash customer', '2026-07-15T00:00:00Z', '2026-07-15T00:00:00Z');`,
    `INSERT OR IGNORE INTO customers (id, company_name, customer_name, mobile, email, gst_number, address, city, state, pincode, notes, created_at, updated_at)
     VALUES (3, NULL, 'Karan Johar', '9000012345', 'karan@gmail.com', NULL, '45, Gokuldham Society, Satellite', 'Ahmedabad', 'Gujarat', '380015', 'Residential owner', '2026-07-15T00:00:00Z', '2026-07-15T00:00:00Z');`,

    // 2. Seed customer_contacts
    `INSERT OR IGNORE INTO customer_contacts (id, customer_id, contact_name, mobile, designation, notes, created_at, updated_at)
     VALUES (1, 1, 'Mahesh Kumar', '9988776655', 'Site Supervisor', 'Handles CG Road site delivery', '2026-07-15T00:00:00Z', '2026-07-15T00:00:00Z');`,
    `INSERT OR IGNORE INTO customer_contacts (id, customer_id, contact_name, mobile, designation, notes, created_at, updated_at)
     VALUES (2, 2, 'Sanjay Shah', '9911223344', 'Store Manager', 'Verifies invoice payments', '2026-07-15T00:00:00Z', '2026-07-15T00:00:00Z');`,

    // 3. Seed business_contacts
    `INSERT OR IGNORE INTO business_contacts (id, name, mobile, alternate_mobile, email, address, city, state, pincode, notes, is_active, created_at, updated_at)
     VALUES (1, 'Ramesh Plumber', '9426012345', '9898012345', 'ramesh@plumber.com', 'Vasna', 'Ahmedabad', 'Gujarat', '380007', 'Expert plumbing worker, Prince pipes specialist', 1, '2026-07-15T00:00:00Z', '2026-07-15T00:00:00Z');`,
    `INSERT OR IGNORE INTO business_contacts (id, name, mobile, alternate_mobile, email, address, city, state, pincode, notes, is_active, created_at, updated_at)
     VALUES (2, 'Vikram Contractor', '9377012345', NULL, 'vikram@builder.com', 'Navrangpura', 'Ahmedabad', 'Gujarat', '380009', 'Large plumbing project sub-contractor', 1, '2026-07-15T00:00:00Z', '2026-07-15T00:00:00Z');`,
    `INSERT OR IGNORE INTO business_contacts (id, name, mobile, alternate_mobile, email, address, city, state, pincode, notes, is_active, created_at, updated_at)
     VALUES (3, 'Dinesh Electrician', '9825012345', NULL, 'dinesh@electric.com', 'Ghatlodia', 'Ahmedabad', 'Gujarat', '380061', 'General electrician contacts', 1, '2026-07-15T00:00:00Z', '2026-07-15T00:00:00Z');`,

    // 4. Seed business_contact_role_map
    `INSERT OR IGNORE INTO business_contact_role_map (contact_id, role_id, created_at)
     VALUES (1, 1, '2026-07-15T00:00:00Z');`,
    `INSERT OR IGNORE INTO business_contact_role_map (contact_id, role_id, created_at)
     VALUES (2, 8, '2026-07-15T00:00:00Z');`,
    `INSERT OR IGNORE INTO business_contact_role_map (contact_id, role_id, created_at)
     VALUES (3, 2, '2026-07-15T00:00:00Z');`
  ]
};
