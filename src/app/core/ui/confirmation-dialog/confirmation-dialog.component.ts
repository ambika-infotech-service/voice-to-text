import { Component, inject } from '@angular/core';
import { ConfirmationDialogService } from './confirmation-dialog.service';

/**
 * Reusable modal popup component presenting confirmation options.
 */
@Component({
  selector: 'app-confirmation-dialog',
  imports: [],
  template: `
    @if (dialogService.activeDialog(); as dialog) {
      <div class="modal-backdrop fade show"></div>
      <div class="modal fade show d-block" tabindex="-1" role="dialog" aria-modal="true" (click)="dialog.resolve(false)">
        <div class="modal-dialog modal-dialog-centered" role="document" (click)="$event.stopPropagation()">
          <div class="modal-content shadow-lg border-0">
            <div class="modal-header border-0 pt-4 px-4">
              <h5 class="modal-title font-weight-bold text-dark">{{ dialog.title }}</h5>
              <button type="button" class="btn-close" (click)="dialog.resolve(false)" aria-label="Close"></button>
            </div>
            <div class="modal-body px-4 py-2">
              <p class="text-secondary mb-0" style="white-space: pre-line;">{{ dialog.message }}</p>
            </div>
            <div class="modal-footer border-0 pb-4 px-4 gap-2">
              <button type="button" class="btn btn-light px-4 py-2 font-weight-semibold" (click)="dialog.resolve(false)">
                {{ dialog.cancelText }}
              </button>
              <button type="button" class="btn btn-danger px-4 py-2 font-weight-semibold" (click)="dialog.resolve(true)">
                {{ dialog.confirmText }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal {
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(4px);
    }
    .modal-content {
      border-radius: 12px;
    }
  `]
})
export class ConfirmationDialogComponent {
  protected readonly dialogService = inject(ConfirmationDialogService);
}
