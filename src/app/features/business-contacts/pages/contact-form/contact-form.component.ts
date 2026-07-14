import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BusinessContactService } from '../../services/business-contact.service';
import { BusinessContact } from '../../../../core/database/models/business-contact.model';
import { ContactRole } from '../../../../core/database/models/contact-role.model';
import { ToastService } from '../../../../core/ui/toast/toast.service';

/**
 * Component for adding or editing a global Business Contact profile.
 * Displays form fields, handles validation, and presents a multi-select checkbox list for roles.
 */
@Component({
  selector: 'app-contact-form',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss'
})
export class ContactFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly contactService = inject(BusinessContactService);
  private readonly toast = inject(ToastService);

  protected contactForm!: FormGroup;
  protected readonly isEditMode = signal(false);
  protected readonly contactId = signal<number | null>(null);
  protected readonly isSubmitting = signal(false);
  protected readonly roles = signal<ContactRole[]>([]);

  // Selected role ids set for easy checkbox binding and submission
  protected readonly selectedRoleIds = signal<number[]>([]);

  private readonly indianMobileRegex = '^([6-9]\\d{9})?$';

  public ngOnInit(): void {
    this.initializeForm();
    this.loadRolesAndCheckRoute();
  }

  private initializeForm(): void {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      mobile: ['', [Validators.pattern(this.indianMobileRegex)]],
      alternate_mobile: ['', [Validators.pattern(this.indianMobileRegex)]],
      email: ['', [Validators.email]],
      address: [''],
      city: [''],
      state: [''],
      pincode: ['', [Validators.pattern('^(\\d{6})?$')]], // Indian pincode (6 digits)
      notes: [''],
      is_active: [1, Validators.required]
    });
  }

  private async loadRolesAndCheckRoute(): Promise<void> {
    try {
      const list = await this.contactService.getRoles(true);
      this.roles.set(list);

      const idParam = this.route.snapshot.paramMap.get('id');
      if (idParam) {
        const id = Number(idParam);
        if (!isNaN(id)) {
          this.isEditMode.set(true);
          this.contactId.set(id);
          await this.loadContactData(id);
        }
      }
    } catch (err) {
      console.error('Failed to initialize form data:', err);
    }
  }

  private async loadContactData(id: number): Promise<void> {
    try {
      const contact = await this.contactService.getContact(id);
      if (contact) {
        this.contactForm.patchValue({
          name: contact.name,
          mobile: contact.mobile || '',
          alternate_mobile: contact.alternate_mobile || '',
          email: contact.email || '',
          address: contact.address || '',
          city: contact.city || '',
          state: contact.state || '',
          pincode: contact.pincode || '',
          notes: contact.notes || '',
          is_active: contact.is_active
        });
        if (contact.role_ids) {
          this.selectedRoleIds.set(contact.role_ids);
        }
      } else {
        this.toast.error('Business contact profile not found.');
        this.router.navigate(['/business-contacts']);
      }
    } catch (err) {
      console.error('Failed to load contact data:', err);
    }
  }

  /**
   * Check if a role ID is currently selected.
   */
  protected isRoleChecked(roleId: number): boolean {
    return this.selectedRoleIds().includes(roleId);
  }

  /**
   * Toggles role checkbox selection.
   */
  protected onRoleToggle(roleId: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedRoleIds.update(ids => {
      if (checked) {
        return [...ids, roleId];
      } else {
        return ids.filter(id => id !== roleId);
      }
    });
  }

  /**
   * Submits form and saves database records.
   */
  protected async onSubmit(): Promise<void> {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.toast.error('Please correct the validation errors in the form.');
      return;
    }

    if (this.selectedRoleIds().length === 0) {
      this.toast.warning('Please select at least one role/profession.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const formVal = this.contactForm.value;
      const timestamp = new Date().toISOString();

      const contact: BusinessContact = {
        id: this.isEditMode() ? this.contactId()! : undefined,
        name: formVal.name.trim(),
        mobile: formVal.mobile || null,
        alternate_mobile: formVal.alternate_mobile || null,
        email: formVal.email || null,
        address: formVal.address || null,
        city: formVal.city || null,
        state: formVal.state || null,
        pincode: formVal.pincode || null,
        notes: formVal.notes || null,
        is_active: Number(formVal.is_active),
        created_at: timestamp,
        updated_at: timestamp
      };

      if (this.isEditMode()) {
        await this.contactService.updateContact(contact, this.selectedRoleIds());
        this.router.navigate(['/business-contacts', this.contactId()]);
      } else {
        const newId = await this.contactService.createContact(contact, this.selectedRoleIds());
        this.router.navigate(['/business-contacts', newId]);
      }
    } catch (err) {
      console.error('Error saving business contact:', err);
      this.toast.error('Failed to save business contact details.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
