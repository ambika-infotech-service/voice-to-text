import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database';
import { BusinessContact } from '../models/business-contact.model';
import { ContactRole } from '../models/contact-role.model';

/**
 * Helper to normalize mobile fields: empty strings or whitespace are written as null.
 */
function normalizeField(m?: string | null): string | null {
  if (!m) return null;
  const trimmed = m.trim();
  return trimmed === '' ? null : trimmed;
}

@Service()
export class BusinessContactRepository {
  private readonly db = inject(DatabaseService);

  /**
   * Creates a new business contact along with their roles mapping in a single transaction.
   */
  public async createContact(contact: BusinessContact, roleIds: number[]): Promise<number> {
    let contactId = -1;
    await this.db.runTransaction(async () => {
      const sql = `
        INSERT INTO business_contacts (
          name, mobile, alternate_mobile, email, address, city, state, pincode, notes, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `;
      const res = await this.db.run(sql, [
        contact.name.trim(),
        normalizeField(contact.mobile),
        normalizeField(contact.alternate_mobile),
        normalizeField(contact.email),
        normalizeField(contact.address),
        normalizeField(contact.city),
        normalizeField(contact.state),
        normalizeField(contact.pincode),
        normalizeField(contact.notes),
        contact.is_active ?? 1,
        contact.created_at,
        contact.updated_at
      ]);
      contactId = res.lastId ?? -1;

      if (contactId === -1) {
        throw new Error('Failed to insert business contact record.');
      }

      // Insert mappings
      for (const roleId of roleIds) {
        await this.db.run(`
          INSERT INTO business_contact_role_map (contact_id, role_id, created_at)
          VALUES (?, ?, ?);
        `, [contactId, roleId, contact.created_at]);
      }
    });
    return contactId;
  }

  /**
   * Updates an existing business contact and their role maps in a single transaction.
   */
  public async updateContact(contact: BusinessContact, roleIds: number[]): Promise<void> {
    if (contact.id === undefined) {
      throw new Error('Contact ID must be defined for updates.');
    }

    await this.db.runTransaction(async () => {
      // 1. Update basic fields
      const sql = `
        UPDATE business_contacts SET
          name = ?,
          mobile = ?,
          alternate_mobile = ?,
          email = ?,
          address = ?,
          city = ?,
          state = ?,
          pincode = ?,
          notes = ?,
          is_active = ?,
          updated_at = ?
        WHERE id = ?;
      `;
      await this.db.run(sql, [
        contact.name.trim(),
        normalizeField(contact.mobile),
        normalizeField(contact.alternate_mobile),
        normalizeField(contact.email),
        normalizeField(contact.address),
        normalizeField(contact.city),
        normalizeField(contact.state),
        normalizeField(contact.pincode),
        normalizeField(contact.notes),
        contact.is_active ?? 1,
        contact.updated_at,
        contact.id
      ]);

      // 2. Refresh role mappings
      await this.db.run(`DELETE FROM business_contact_role_map WHERE contact_id = ?;`, [contact.id]);
      for (const roleId of roleIds) {
        await this.db.run(`
          INSERT INTO business_contact_role_map (contact_id, role_id, created_at)
          VALUES (?, ?, ?);
        `, [contact.id, roleId, contact.updated_at]);
      }
    });
  }

  /**
   * Deletes a business contact profile. Cascade deletes the role mappings.
   */
  public async deleteContact(id: number): Promise<void> {
    const sql = `DELETE FROM business_contacts WHERE id = ?;`;
    await this.db.run(sql, [id]);
  }

  /**
   * Retrieves a single contact profile by ID, parsing its roles mapping.
   */
  public async getContact(id: number): Promise<BusinessContact | null> {
    const sql = `
      SELECT bc.*, 
             GROUP_CONCAT(cr.role_name, ', ') as roles_csv,
             GROUP_CONCAT(cr.id, ', ') as role_ids_csv
      FROM business_contacts bc
      LEFT JOIN business_contact_role_map bcrm ON bc.id = bcrm.contact_id
      LEFT JOIN contact_roles cr ON bcrm.role_id = cr.id
      WHERE bc.id = ?
      GROUP BY bc.id LIMIT 1;
    `;
    const rows = await this.db.query<any>(sql, [id]);
    if (rows.length === 0) {
      return null;
    }
    const row = rows[0];
    return {
      ...row,
      roles: row.roles_csv ? row.roles_csv.split(', ') : [],
      role_ids: row.role_ids_csv ? row.role_ids_csv.split(',').map((id: string) => Number(id)) : []
    };
  }

  /**
   * Fetches paginated business contacts, optionally filtered and sorted.
   */
  public async getContacts(options: {
    sortBy?: 'name' | 'recently_added';
    search?: string;
    roleId?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ contacts: BusinessContact[]; totalCount: number }> {
    const { sortBy = 'name', search = '', roleId, limit = 10, offset = 0 } = options;

    let whereConditions: string[] = [];
    const params: unknown[] = [];

    if (search.trim() !== '') {
      const term = `%${search.trim()}%`;
      whereConditions.push(`(bc.name LIKE ? OR bc.mobile LIKE ? OR bc.city LIKE ? OR cr.role_name LIKE ?)`);
      params.push(term, term, term, term);
    }

    if (roleId !== undefined && roleId !== null && !isNaN(roleId)) {
      whereConditions.push(`bc.id IN (SELECT contact_id FROM business_contact_role_map WHERE role_id = ?)`);
      params.push(roleId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Order clause
    const orderClause = sortBy === 'name'
      ? 'ORDER BY LOWER(bc.name) ASC'
      : 'ORDER BY bc.created_at DESC, bc.id DESC';

    // Get count of unique contacts matching filters
    const countSql = `
      SELECT COUNT(DISTINCT bc.id) as count 
      FROM business_contacts bc
      LEFT JOIN business_contact_role_map bcrm ON bc.id = bcrm.contact_id
      LEFT JOIN contact_roles cr ON bcrm.role_id = cr.id
      ${whereClause};
    `;
    const countRows = await this.db.query<{ count: number }>(countSql, params);
    const totalCount = countRows[0]?.count ?? 0;

    // Fetch matching contacts
    const querySql = `
      SELECT bc.*, 
             GROUP_CONCAT(cr.role_name, ', ') as roles_csv,
             GROUP_CONCAT(cr.id, ', ') as role_ids_csv
      FROM business_contacts bc
      LEFT JOIN business_contact_role_map bcrm ON bc.id = bcrm.contact_id
      LEFT JOIN contact_roles cr ON bcrm.role_id = cr.id
      ${whereClause}
      GROUP BY bc.id
      ${orderClause}
      LIMIT ? OFFSET ?;
    `;
    const rows = await this.db.query<any>(querySql, [...params, limit, offset]);
    const contacts = rows.map(row => ({
      ...row,
      roles: row.roles_csv ? row.roles_csv.split(', ') : [],
      role_ids: row.role_ids_csv ? row.role_ids_csv.split(',').map((id: string) => Number(id)) : []
    }));

    return { contacts, totalCount };
  }

  /**
   * Fetches contacts mapping to a specific role ID.
   */
  public async getContactsByRole(roleId: number): Promise<BusinessContact[]> {
    const sql = `
      SELECT bc.*, 
             GROUP_CONCAT(cr.role_name, ', ') as roles_csv,
             GROUP_CONCAT(cr.id, ', ') as role_ids_csv
      FROM business_contacts bc
      JOIN business_contact_role_map bcrm ON bc.id = bcrm.contact_id
      JOIN contact_roles cr ON bcrm.role_id = cr.id
      WHERE bc.id IN (SELECT contact_id FROM business_contact_role_map WHERE role_id = ?)
      GROUP BY bc.id
      ORDER BY LOWER(bc.name) ASC;
    `;
    const rows = await this.db.query<any>(sql, [roleId]);
    return rows.map(row => ({
      ...row,
      roles: row.roles_csv ? row.roles_csv.split(', ') : [],
      role_ids: row.role_ids_csv ? row.role_ids_csv.split(',').map((id: string) => Number(id)) : []
    }));
  }

  /**
   * Searches business contacts prioritizing by matching query type (Exact -> Starts With -> Contains).
   * Searches name, mobile, role name, and city.
   */
  public async searchContacts(query: string): Promise<BusinessContact[]> {
    const trimmed = query.trim();
    if (trimmed === '') {
      return [];
    }

    const exact = trimmed;
    const startsWith = `${trimmed}%`;
    const contains = `%${trimmed}%`;

    const sql = `
      SELECT bc.*, 
             GROUP_CONCAT(cr.role_name, ', ') as roles_csv,
             GROUP_CONCAT(cr.id, ', ') as role_ids_csv,
             MIN(CASE
               WHEN LOWER(bc.name) = LOWER(?) OR bc.mobile = ? OR LOWER(bc.city) = LOWER(?) OR LOWER(cr.role_name) = LOWER(?) THEN 1
               WHEN bc.name LIKE ? OR bc.mobile LIKE ? OR bc.city LIKE ? OR cr.role_name LIKE ? THEN 2
               ELSE 3
             END) as match_priority
      FROM business_contacts bc
      LEFT JOIN business_contact_role_map bcrm ON bc.id = bcrm.contact_id
      LEFT JOIN contact_roles cr ON bcrm.role_id = cr.id
      WHERE bc.name LIKE ?
         OR bc.mobile LIKE ?
         OR bc.city LIKE ?
         OR cr.role_name LIKE ?
      GROUP BY bc.id
      ORDER BY match_priority ASC, LOWER(bc.name) ASC;
    `;

    const params = [
      // Exact check
      exact, exact, exact, exact,
      // Starts with check
      startsWith, startsWith, startsWith, startsWith,
      // Filters
      contains, contains, contains, contains
    ];

    const rows = await this.db.query<any>(sql, params);
    return rows.map(row => ({
      ...row,
      roles: row.roles_csv ? row.roles_csv.split(', ') : [],
      role_ids: row.role_ids_csv ? row.role_ids_csv.split(',').map((id: string) => Number(id)) : []
    }));
  }

  /**
   * Fetches roles from the master table.
   */
  public async getRoles(onlyActive = false): Promise<ContactRole[]> {
    const condition = onlyActive ? 'WHERE is_active = 1' : '';
    const sql = `SELECT * FROM contact_roles ${condition} ORDER BY display_order ASC, role_name ASC;`;
    return this.db.query<ContactRole>(sql);
  }

  /**
   * Inserts a new role in the master roles table.
   */
  public async createRole(role: ContactRole): Promise<number> {
    const sql = `
      INSERT INTO contact_roles (role_name, display_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?);
    `;
    const res = await this.db.run(sql, [
      role.role_name.trim(),
      role.display_order ?? 0,
      role.is_active ?? 1,
      role.created_at,
      role.updated_at
    ]);
    return res.lastId ?? -1;
  }

  /**
   * Updates an existing role in the master table.
   */
  public async updateRole(role: ContactRole): Promise<void> {
    if (role.id === undefined) {
      throw new Error('Role ID must be defined for updates.');
    }
    const sql = `
      UPDATE contact_roles SET
        role_name = ?,
        display_order = ?,
        is_active = ?,
        updated_at = ?
      WHERE id = ?;
    `;
    await this.db.run(sql, [
      role.role_name.trim(),
      role.display_order ?? 0,
      role.is_active ?? 1,
      role.updated_at,
      role.id
    ]);
  }

  /**
   * Checks if a role ID is currently assigned to any business contact.
   */
  public async isRoleInUse(roleId: number): Promise<boolean> {
    const sql = `SELECT COUNT(*) as count FROM business_contact_role_map WHERE role_id = ?;`;
    const rows = await this.db.query<{ count: number }>(sql, [roleId]);
    return (rows[0]?.count ?? 0) > 0;
  }

  /**
   * Deletes a role from the master roles table if it is not in use.
   */
  public async deleteRole(id: number): Promise<void> {
    if (await this.isRoleInUse(id)) {
      throw new Error('This role is currently assigned to one or more business contacts and cannot be deleted.');
    }
    const sql = `DELETE FROM contact_roles WHERE id = ?;`;
    await this.db.run(sql, [id]);
  }

  /**
   * Maps roles to a contact manually.
   */
  public async assignRoles(contactId: number, roleIds: number[], timestamp: string): Promise<void> {
    await this.db.runTransaction(async () => {
      for (const roleId of roleIds) {
        await this.db.run(`
          INSERT OR IGNORE INTO business_contact_role_map (contact_id, role_id, created_at)
          VALUES (?, ?, ?);
        `, [contactId, roleId, timestamp]);
      }
    });
  }

  /**
   * Unmaps roles from a contact manually.
   */
  public async removeRoles(contactId: number, roleIds: number[]): Promise<void> {
    await this.db.runTransaction(async () => {
      for (const roleId of roleIds) {
        await this.db.run(`
          DELETE FROM business_contact_role_map 
          WHERE contact_id = ? AND role_id = ?;
        `, [contactId, roleId]);
      }
    });
  }
}
