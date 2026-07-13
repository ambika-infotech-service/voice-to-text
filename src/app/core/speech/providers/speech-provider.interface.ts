import { Observable } from 'rxjs';
import { SpeechState } from '../models/speech-state.model';

/**
 * Interface defining the requirements for any speech recognition provider.
 * This allows swapping out implementations (e.g., Browser API, Whisper, Azure)
 * without modifying the core SpeechService.
 */
export interface SpeechProvider {
  /**
   * Stream of state updates emitted by the speech provider.
   */
  readonly state$: Observable<Partial<SpeechState>>;

  /**
   * Initializes the speech provider (e.g., instantiates objects, checks constraints).
   */
  initialize(): void;

  /**
   * Starts the speech recognition process.
   */
  start(): void;

  /**
   * Stops the speech recognition process gracefully, processing remaining audio.
   */
  stop(): void;

  /**
   * Aborts the speech recognition process immediately, discarding remaining audio.
   */
  abort(): void;

  /**
   * Sets the language of the speech provider.
   * @param lang The language locale code (e.g., 'en-US', 'es-ES').
   */
  setLanguage(lang: string): void;

  /**
   * Verifies if speech recognition is supported in the current environment.
   */
  isSupported(): boolean;
}
