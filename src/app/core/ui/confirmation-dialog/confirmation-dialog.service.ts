import { Service, signal } from '@angular/core';

/**
 * Custom settings configurations for confirmation requests.
 */
export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * State representing a requested confirmation dialog inside the pipeline.
 */
export interface ConfirmationState extends ConfirmationOptions {
  resolve: (value: boolean) => void;
}

/**
 * Reusable service requesting user confirmations via async-await promise interfaces.
 */
@Service()
export class ConfirmationDialogService {
  private readonly state = signal<ConfirmationState | null>(null);

  /** Read-only active confirmation dialog request state. */
  public readonly activeDialog = this.state.asReadonly();

  /**
   * Prompts a confirmation dialog screen overlay.
   * @param options Dialogue text definitions.
   * @returns Promise resolving to true if user clicks confirm, false otherwise.
   */
  public confirm(options: ConfirmationOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.state.set({
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Delete',
        cancelText: options.cancelText ?? 'Cancel',
        resolve: (result: boolean) => {
          this.state.set(null);
          resolve(result);
        }
      });
    });
  }
}
