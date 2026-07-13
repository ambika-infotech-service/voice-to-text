import { Component, OnInit, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { DatabaseService } from './core/database/database';
import { SpeechDemo } from './core/speech/components/speech-demo/speech-demo';
import { DatabaseDemo } from './core/database/components/database-demo/database-demo';
import { BillingPage } from './features/billing/pages/billing-page/billing-page';

/**
 * Root Application component.
 * Coordinates initialization of the SQLite data engine and switches demo dashboards.
 */
@Component({
  selector: 'app-root',
  imports: [SpeechDemo, DatabaseDemo, BillingPage],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class App implements OnInit {
  private readonly dbService = inject(DatabaseService);

  protected readonly title = signal('voice-to-text');

  // App views: 'billing' = Invoice Generator, 'speech' = Voice Assistant, 'database' = CRUD Data Browser
  protected readonly activeTab = signal<'billing' | 'speech' | 'database'>('billing');

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

  protected switchView(tab: 'billing' | 'speech' | 'database'): void {
    this.activeTab.set(tab);
  }
}
