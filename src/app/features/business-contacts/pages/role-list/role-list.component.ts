import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { BusinessContactService } from '../../services/business-contact.service';
import { ContactRole } from '../../../../core/database/models/contact-role.model';
import { ConfirmationDialogService } from '../../../../core/ui/confirmation-dialog/confirmation-dialog.service';
import { ToastService } from '../../../../core/ui/toast/toast.service';

/**
 * Page component rendering the Roles master list.
 * Admins can CRUD role configurations, manage display sorting orders, and disable roles.
 * Includes validation to prohibit deletion of roles that are currently assigned to contacts.
 */
@Component({
  selector: 'app-role-list',
  imports: [RouterLink, ReactiveFormsModule, FormsModule],
  templateUrl: './role-list.component.html',
  styleUrl: './role-list.component.scss'
})
export class RoleListComponent implements OnInit {
  private readonly contactService = inject(BusinessContactService);
  private readonly confirmService = inject(ConfirmationDialogService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  // States
  protected readonly roles = signal<ContactRole[]>([]);
  protected readonly isLoading = signal(false);

  // Sub Form management
  protected roleForm!: FormGroup;
  protected readonly isEditing = signal(false);
  protected readonly editingRoleId = signal<number | null>(null);
  protected readonly isSubmitting = signal(false);

  public ngOnInit(): void {
    this.initializeForm();
    this.fetchRoles();
  }

  private initializeForm(): void {
    this.roleForm = this.fb.group({
      role_name: ['', [Validators.required, Validators.minLength(2)]],
      display_order: [0, [Validators.required, Validators.min(0)]],
      is_active: [1, Validators.required]
    });
  }

  /**
   * Fetches roles catalog list.
   */
  protected async fetchRoles(): Promise<void> {
    this.isLoading.set(true);
    try {
      const list = await this.contactService.getRoles();
      this.roles.set(list);
    } catch (err) {
      console.error('Failed to load roles list:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Bind selected role details to editor.
   */
  protected onEditRole(role: ContactRole): void {
    this.isEditing.set(true);
    this.editingRoleId.set(role.id!);
    this.roleForm.patchValue({
      role_name: role.role_name,
      display_order: role.display_order,
      is_active: role.is_active
    });
  }

  /**
   * Cancel edit status and clear form inputs.
   */
  protected onCancelEdit(): void {
    this.isEditing.set(false);
    this.editingRoleId.set(null);
    this.roleForm.reset({
      role_name: '',
      display_order: 0,
      is_active: 1
    });
  }

  /**
   * Submit insert or update transactions.
   */
  protected async onSubmit(): Promise<void> {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      this.toast.error('Please enter a valid role name.');
      return;
    }

    this.isSubmitting.set(true);
    try {
      const formVal = this.roleForm.value;
      const timestamp = new Date().toISOString();

      if (this.isEditing()) {
        const role: ContactRole = {
          id: this.editingRoleId()!,
          role_name: formVal.role_name.trim(),
          display_order: Number(formVal.display_order),
          is_active: Number(formVal.is_active),
          created_at: '', // Ignore updating created_at
          updated_at: timestamp
        };
        await this.contactService.updateRole(role);
        this.onCancelEdit();
      } else {
        const role: ContactRole = {
          role_name: formVal.role_name.trim(),
          display_order: Number(formVal.display_order),
          is_active: Number(formVal.is_active),
          created_at: timestamp,
          updated_at: timestamp
        };
        await this.contactService.createRole(role);
        this.roleForm.reset({
          role_name: '',
          display_order: 0,
          is_active: 1
        });
      }
      await this.fetchRoles();
    } catch (err: any) {
      console.error('Failed to save role:', err);
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        this.toast.error('A profession role with this name already exists.');
      } else {
        this.toast.error('Failed to save profession role details.');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /**
   * Deletes a role from database. Catches constraint violations if assigned.
   */
  protected async onDeleteRole(role: ContactRole): Promise<void> {
    if (!role.id) return;

    const confirmed = await this.confirmService.confirm({
      title: 'Delete Master Role',
      message: `Are you sure you want to delete the profession role "${role.role_name}"?\nThis cannot be undone.`,
      confirmText: 'Delete Role',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      const success = await this.contactService.deleteRole(role.id);
      if (success) {
        await this.fetchRoles();
      }
    }
  }
}
