import { Component, OnInit, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { DatabaseService } from './core/database/database';
import { ToastComponent } from './core/ui/toast/toast.component';
import { ConfirmationDialogComponent } from './core/ui/confirmation-dialog/confirmation-dialog.component';

/**
 * Root Application component.
 * Coordinates initialization of the SQLite data engine and manages global UI layers.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, ConfirmationDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class App implements OnInit {
  private readonly dbService = inject(DatabaseService);

  protected readonly title = signal('voice-to-text');

  // Database loading states
  protected readonly isDbReady = signal(false);
  protected readonly dbErrorMsg = signal<string | null>(null);

  public async ngOnInit(): Promise<void> {
    try {
      // Bootstrap the SQLite connection and migrations
      await this.dbService.initialize();
      this.isDbReady.set(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.dbErrorMsg.set(msg);
      console.error('Failed to bootstrap SQLite engine:', err);
    }
  }
}
