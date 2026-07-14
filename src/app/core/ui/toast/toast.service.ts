import { Service, signal } from '@angular/core';

/**
 * Represents a single toast alert message.
 */
export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'danger' | 'warning' | 'info';
}

/**
 * Reusable toast notification service powered by Angular Signals.
 */
@Service()
export class ToastService {
  private readonly toastsState = signal<Toast[]>([]);

  /** Read-only state representing currently active toast notifications. */
  public readonly toasts = this.toastsState.asReadonly();

  /**
   * Triggers a new toast message.
   * @param message Text copy to show.
   * @param type Alert contextual type.
   * @param duration Display time in milliseconds before automatic dismissal (set 0 to keep open).
   */
  public show(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'success', duration = 3000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type };

    this.toastsState.update(toasts => [...toasts, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  public success(message: string, duration = 3000): void {
    this.show(message, 'success', duration);
  }

  public error(message: string, duration = 4000): void {
    this.show(message, 'danger', duration);
  }

  public warning(message: string, duration = 3500): void {
    this.show(message, 'warning', duration);
  }

  public info(message: string, duration = 3000): void {
    this.show(message, 'info', duration);
  }

  /**
   * Dismisses a toast message by ID.
   */
  public dismiss(id: string): void {
    this.toastsState.update(toasts => toasts.filter(t => t.id !== id));
  }
}
