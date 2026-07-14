import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

/**
 * Overlay component that displays active application toasts in a fixed container.
 */
@Component({
  selector: 'app-toast',
  imports: [],
  template: `
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 2000;">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast show align-items-center border-0 mb-2 shadow-lg border-start border-4"
             [class.border-success]="toast.type === 'success'"
             [class.bg-success-subtle]="toast.type === 'success'"
             [class.text-success-emphasis]="toast.type === 'success'"
             [class.border-danger]="toast.type === 'danger'"
             [class.bg-danger-subtle]="toast.type === 'danger'"
             [class.text-danger-emphasis]="toast.type === 'danger'"
             [class.border-warning]="toast.type === 'warning'"
             [class.bg-warning-subtle]="toast.type === 'warning'"
             [class.text-warning-emphasis]="toast.type === 'warning'"
             [class.border-info]="toast.type === 'info'"
             [class.bg-info-subtle]="toast.type === 'info'"
             [class.text-info-emphasis]="toast.type === 'info'"
             role="alert" aria-live="assertive" aria-atomic="true">
          <div class="d-flex">
            <div class="toast-body py-3 flex-grow-1">
              {{ toast.message }}
            </div>
            <button type="button" class="btn-close me-2 m-auto" 
                    [class.btn-close-white]="false"
                    (click)="toastService.dismiss(toast.id)" aria-label="Close"></button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      max-width: 360px;
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      transition: all 0.25s ease-in-out;
      border-radius: 6px;
      display: flex;
    }
  `]
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);
}
