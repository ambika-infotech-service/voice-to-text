import { DestroyRef, Service, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SPEECH_PROVIDER } from '../providers/speech-provider.token';
import { SpeechState } from '../models/speech-state.model';

const initialState: SpeechState = {
  status: 'idle',
  transcript: '',
  finalTranscript: '',
  confidence: 0,
  language: 'en-US',
  error: null,
  errorMessage: null
};

/**
 * Service that exposes speech recognition status and controls via Angular Signals.
 * Orchestrates communication with the active SpeechProvider.
 */
@Service()
export class SpeechService {
  private readonly provider = inject(SPEECH_PROVIDER);
  private readonly destroyRef = inject(DestroyRef);

  private readonly stateSignal = signal<SpeechState>(initialState);

  /** Exposes the current speech recognition state as a read-only Signal. */
  public readonly state = this.stateSignal.asReadonly();

  constructor() {
    // Automatically initialize provider on creation
    this.provider.initialize();

    // Sync provider state updates into the Angular signal state
    this.provider.state$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((update) => {
        this.stateSignal.update((current) => ({
          ...current,
          ...update
        }));
      });
  }

  /**
   * Starts speech recognition.
   */
  public start(): void {
    this.provider.start();
  }

  /**
   * Gracefully stops speech recognition.
   */
  public stop(): void {
    this.provider.stop();
  }

  /**
   * Immediately aborts speech recognition.
   */
  public abort(): void {
    this.provider.abort();
  }

  /**
   * Resets the speech recognition state to initial values, preserving the current language.
   */
  public reset(): void {
    this.provider.abort();
    this.stateSignal.set({
      ...initialState,
      language: this.stateSignal().language
    });
  }

  /**
   * Configures the recognition language.
   * @param lang The language locale code (e.g., 'en-US', 'es-ES').
   */
  public setLanguage(lang: string): void {
    this.provider.setLanguage(lang);
  }

  /**
   * Checks if speech recognition is supported in the current environment.
   */
  public isSupported(): boolean {
    return this.provider.isSupported();
  }
}
