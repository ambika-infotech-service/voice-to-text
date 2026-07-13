import { SpeechStatus } from '../types/speech-status.type';
import { SpeechErrorCode } from '../types/speech-error-code.type';

/**
 * Represents the state model of the speech recognition module.
 */
export interface SpeechState {
  /** The current status of recognition. */
  readonly status: SpeechStatus;
  /** Combined current transcription (live intermediate + final results). */
  readonly transcript: string;
  /** Only verified final transcription results. */
  readonly finalTranscript: string;
  /** Confidence score of the transcription, from 0.0 to 1.0 (when available). */
  readonly confidence: number;
  /** Language configuration code, e.g., 'en-US', 'es-ES'. */
  readonly language: string;
  /** Normalized error code, if status is 'error'. */
  readonly error: SpeechErrorCode | null;
  /** Human-readable, localized message explaining the error. */
  readonly errorMessage: string | null;
}
