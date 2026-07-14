import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BusinessContactService } from '../../services/business-contact.service';
import { BusinessContact } from '../../../../core/database/models/business-contact.model';
import { ContactRole } from '../../../../core/database/models/contact-role.model';
import { ConfirmationDialogService } from '../../../../core/ui/confirmation-dialog/confirmation-dialog.service';

/**
 * Page component rendering the business contacts list grid.
 * Supports filtering by keyword search (name, mobile, city, role), role type, custom sorting, and pagination.
 */
@Component({
  selector: 'app-contact-list',
  imports: [RouterLink, FormsModule],
  templateUrl: './contact-list.component.html',
  styleUrl: './contact-list.component.scss'
})
export class ContactListComponent implements OnInit {
  private readonly contactService = inject(BusinessContactService);
  private readonly confirmService = inject(ConfirmationDialogService);

  // States
  protected readonly contacts = signal<BusinessContact[]>([]);
  protected readonly roles = signal<ContactRole[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(false);

  // Filters & Pagination params
  protected readonly searchText = signal('');
  protected readonly selectedRoleId = signal<string>(''); // Bound to string for select box
  protected readonly sortBy = signal<'name' | 'recently_added'>('name');
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);

  public ngOnInit(): void {
    this.loadRoles();
    this.fetchData();
  }

  private async loadRoles(): Promise<void> {
    try {
      const list = await this.contactService.getRoles(true);
      this.roles.set(list);
    } catch (err) {
      console.error('Failed to load roles for filtering:', err);
    }
  }

  /**
   * Fetches matching business contacts list based on selected filters and pagination offset.
   */
  protected async fetchData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const offset = (this.page() - 1) * this.pageSize();
      const roleIdVal = this.selectedRoleId() ? Number(this.selectedRoleId()) : undefined;

      const res = await this.contactService.getContacts({
        sortBy: this.sortBy(),
        search: this.searchText(),
        roleId: roleIdVal,
        limit: this.pageSize(),
        offset
      });
      this.contacts.set(res.contacts);
      this.totalCount.set(res.totalCount);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Resets active page and fetches data.
   */
  protected onFilterChange(): void {
    this.page.set(1);
    this.fetchData();
  }

  /**
   * Navigate to target page.
   */
  protected setPage(pageNo: number): void {
    if (pageNo < 1 || pageNo > this.totalPages()) return;
    this.page.set(pageNo);
    this.fetchData();
  }

  /**
   * Computes total pages count.
   */
  protected totalPages(): number {
    return Math.ceil(this.totalCount() / this.pageSize()) || 1;
  }

  /**
   * Prompts and deletes contact.
   */
  protected async deleteContact(contact: BusinessContact): Promise<void> {
    if (!contact.id) return;
    const confirmed = await this.confirmService.confirm({
      title: 'Delete Business Contact',
      message: `Are you sure you want to delete the business contact "${contact.name}"?\nThis action is permanent and cannot be undone.`,
      confirmText: 'Delete Contact',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      const success = await this.contactService.deleteContact(contact.id);
      if (success) {
        if (this.contacts().length === 1 && this.page() > 1) {
          this.page.update(p => p - 1);
        }
        await this.fetchData();
      }
    }
  }
}
