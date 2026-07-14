import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BusinessContactService } from '../../services/business-contact.service';
import { BusinessContact } from '../../../../core/database/models/business-contact.model';
import { ConfirmationDialogService } from '../../../../core/ui/confirmation-dialog/confirmation-dialog.service';
import { ToastService } from '../../../../core/ui/toast/toast.service';

/**
 * Component displaying full profiles of a business contact, including mapped roles and notes.
 * Includes a future ready section for Invoice history integrations.
 */
@Component({
  selector: 'app-contact-details',
  imports: [RouterLink],
  templateUrl: './contact-details.component.html',
  styleUrl: './contact-details.component.scss'
})
export class ContactDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contactService = inject(BusinessContactService);
  private readonly confirmService = inject(ConfirmationDialogService);
  private readonly toast = inject(ToastService);

  // States
  protected readonly contact = signal<BusinessContact | null>(null);
  protected readonly isLoading = signal(true);

  public ngOnInit(): void {
    this.loadContactDetails();
  }

  private async loadContactDetails(): Promise<void> {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (!idParam) {
      this.toast.error('Invalid URL parameters.');
      this.router.navigate(['/business-contacts']);
      return;
    }

    const id = Number(idParam);
    if (isNaN(id)) {
      this.toast.error('Invalid Contact ID.');
      this.router.navigate(['/business-contacts']);
      return;
    }

    this.isLoading.set(true);
    try {
      const res = await this.contactService.getContact(id);
      if (res) {
        this.contact.set(res);
      } else {
        this.toast.error('Business contact profile not found.');
        this.router.navigate(['/business-contacts']);
      }
    } catch (err) {
      console.error('Failed to load contact details:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Deletes the active contact and redirects to list.
   */
  protected async deleteContact(): Promise<void> {
    const contactVal = this.contact();
    if (!contactVal || !contactVal.id) return;

    const confirmed = await this.confirmService.confirm({
      title: 'Delete Business Contact',
      message: `Are you sure you want to delete the business contact "${contactVal.name}"?\nThis action is permanent and irreversible.`,
      confirmText: 'Delete Contact',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      const success = await this.contactService.deleteContact(contactVal.id);
      if (success) {
        this.router.navigate(['/business-contacts']);
      }
    }
  }
}
