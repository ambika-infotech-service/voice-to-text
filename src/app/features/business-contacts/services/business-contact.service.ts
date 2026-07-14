import { Service, inject } from '@angular/core';
import { BusinessContactRepository } from '../../../core/database/repositories/business-contact.repository';
import { ToastService } from '../../../core/ui/toast/toast.service';
import { BusinessContact } from '../../../core/database/models/business-contact.model';
import { ContactRole } from '../../../core/database/models/contact-role.model';

@Service()
export class BusinessContactService {
  private readonly contactRepo = inject(BusinessContactRepository);
  private readonly toast = inject(ToastService);

  /**
   * Creates a new business contact with associated roles.
   */
  public async createContact(contact: BusinessContact, roleIds: number[]): Promise<number> {
    try {
      const id = await this.contactRepo.createContact(contact, roleIds);
      this.toast.success('Business contact registered successfully.');
      return id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to register contact: ${msg}`);
      throw err;
    }
  }

  /**
   * Updates an existing business contact and their role maps.
   */
  public async updateContact(contact: BusinessContact, roleIds: number[]): Promise<void> {
    try {
      await this.contactRepo.updateContact(contact, roleIds);
      this.toast.success('Business contact updated successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to update contact: ${msg}`);
      throw err;
    }
  }

  /**
   * Deletes a business contact profile.
   */
  public async deleteContact(id: number): Promise<boolean> {
    try {
      await this.contactRepo.deleteContact(id);
      this.toast.success('Business contact deleted successfully.');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to delete contact: ${msg}`);
      return false;
    }
  }

  /**
   * Retrieves a single contact profile by ID.
   */
  public async getContact(id: number): Promise<BusinessContact | null> {
    try {
      return await this.contactRepo.getContact(id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to load contact details: ${msg}`);
      return null;
    }
  }

  /**
   * Fetches paginated business contacts list.
   */
  public async getContacts(options: {
    sortBy?: 'name' | 'recently_added';
    search?: string;
    roleId?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ contacts: BusinessContact[]; totalCount: number }> {
    try {
      return await this.contactRepo.getContacts(options);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to load contacts list: ${msg}`);
      throw err;
    }
  }

  /**
   * Fetches business contacts by role mapping ID.
   */
  public async getContactsByRole(roleId: number): Promise<BusinessContact[]> {
    try {
      return await this.contactRepo.getContactsByRole(roleId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to load contacts for this role: ${msg}`);
      return [];
    }
  }

  /**
   * Performs search on independent business contacts.
   */
  public async searchContacts(query: string): Promise<BusinessContact[]> {
    try {
      return await this.contactRepo.searchContacts(query);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Business contact search failed: ${msg}`);
      return [];
    }
  }

  /**
   * Fetches the role master list.
   */
  public async getRoles(onlyActive = false): Promise<ContactRole[]> {
    try {
      return await this.contactRepo.getRoles(onlyActive);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to load contact roles: ${msg}`);
      return [];
    }
  }

  /**
   * Creates a new role in the role master.
   */
  public async createRole(role: ContactRole): Promise<number> {
    try {
      const id = await this.contactRepo.createRole(role);
      this.toast.success('New profession role created.');
      return id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to create role: ${msg}`);
      throw err;
    }
  }

  /**
   * Updates an existing role details.
   */
  public async updateRole(role: ContactRole): Promise<void> {
    try {
      await this.contactRepo.updateRole(role);
      this.toast.success('Role details updated successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to update role: ${msg}`);
      throw err;
    }
  }

  /**
   * Deletes a role from master list (if not mapped to any contacts).
   */
  public async deleteRole(id: number): Promise<boolean> {
    try {
      await this.contactRepo.deleteRole(id);
      this.toast.success('Role deleted successfully.');
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to delete role: ${msg}`);
      return false;
    }
  }

  /**
   * Assigns roles to contact.
   */
  public async assignRoles(contactId: number, roleIds: number[]): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      await this.contactRepo.assignRoles(contactId, roleIds, timestamp);
      this.toast.success('Roles assigned to contact successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to assign roles: ${msg}`);
      throw err;
    }
  }

  /**
   * Removes assigned roles from contact.
   */
  public async removeRoles(contactId: number, roleIds: number[]): Promise<void> {
    try {
      await this.contactRepo.removeRoles(contactId, roleIds);
      this.toast.success('Roles unmapped from contact successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.toast.error(`Failed to remove roles mapping: ${msg}`);
      throw err;
    }
  }
}
