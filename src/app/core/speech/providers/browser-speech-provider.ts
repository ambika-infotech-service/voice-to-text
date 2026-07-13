import { Service } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { SpeechProvider } from './speech-provider.interface';
import { SpeechState } from '../models/speech-state.model';
import { SpeechErrorCode } from '../types/speech-error-code.type';

// Extend window interface for vendor prefixed and standard Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface ISpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: {
    readonly length: number;
    [index: number]: {
      readonly isFinal: boolean;
      readonly length: number;
      [index: number]: {
        readonly transcript: string;
        readonly confidence: number;
      };
    };
  };
}

interface ISpeechRecognitionErrorEvent {
  readonly error: string;
  readonly message?: string;
}

/**
 * SpeechProvider implementation using the standard Browser Web Speech API.
 * Wraps SpeechRecognition and handles Chrome-specific event mappings.
 */
@Service()
export class BrowserSpeechProvider implements SpeechProvider {
  private readonly stateSubject = new Subject<Partial<SpeechState>>();
  public readonly state$: Observable<Partial<SpeechState>> = this.stateSubject.asObservable();

  private recognition: ISpeechRecognition | null = null;
  private currentLanguage = 'en-US';
  private isInitialized = false;

  /**
   * Initializes the browser speech recognition instance.
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    if (typeof window === 'undefined') {
      this.emitError('not-supported', 'Speech recognition is not supported in this environment.');
      return;
    }

    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      this.emitError('not-supported', 'Speech recognition is not supported in this browser.');
      return;
    }

    try {
      this.recognition = new SpeechRecognitionConstructor();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.getBrowserLanguageCode(this.currentLanguage);
      this.recognition.maxAlternatives = 1;

      this.setupEventHandlers();
      this.isInitialized = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.emitError('unknown', `Failed to initialize speech recognition: ${msg}`);
    }
  }

  /**
   * Starts the speech recognition.
   */
  public start(): void {
    this.initialize();
    if (!this.recognition) {
      return;
    }
    try {
      this.recognition.start();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.emitError('unknown', `Start failed: ${msg}`);
    }
  }

  /**
   * Stops the speech recognition.
   */
  public stop(): void {
    if (!this.recognition) {
      return;
    }
    try {
      this.recognition.stop();
      this.stateSubject.next({ status: 'processing' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.emitError('unknown', `Stop failed: ${msg}`);
    }
  }

  /**
   * Aborts the speech recognition.
   */
  public abort(): void {
    if (!this.recognition) {
      return;
    }
    try {
      this.recognition.abort();
      this.stateSubject.next({
        status: 'idle',
        transcript: '',
        finalTranscript: '',
        confidence: 0,
        error: null,
        errorMessage: null
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.emitError('unknown', `Abort failed: ${msg}`);
    }
  }

  /**
   * Sets the language of speech recognition.
   * @param lang The language locale code.
   */
  public setLanguage(lang: string): void {
    this.currentLanguage = lang;
    if (this.recognition) {
      this.recognition.lang = this.getBrowserLanguageCode(lang);
    }
    this.stateSubject.next({ language: lang });
  }

  /**
   * Checks if speech recognition is supported in this browser.
   */
  public isSupported(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  private setupEventHandlers(): void {
    if (!this.recognition) {
      return;
    }

    this.recognition.onstart = () => {
      this.stateSubject.next({
        status: 'listening',
        error: null,
        errorMessage: null
      });
    };

    this.recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';
      let confidence = 0;
      let finalCount = 0;

      for (let i = 0; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
          confidence += result[0].confidence;
          finalCount++;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const avgConfidence = finalCount > 0 ? confidence / finalCount : 0;

      this.stateSubject.next({
        transcript: finalTranscript + interimTranscript,
        finalTranscript: finalTranscript,
        confidence: avgConfidence,
        status: 'listening'
      });
    };

    this.recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      const errorCode = this.mapErrorCode(event.error);
      const errorMessage = this.getErrorMessage(errorCode);
      this.stateSubject.next({
        status: 'error',
        error: errorCode,
        errorMessage: errorMessage
      });
    };

    this.recognition.onend = () => {
      this.stateSubject.next({
        status: 'idle'
      });
    };
  }

  private mapErrorCode(error: string): SpeechErrorCode {
    switch (error) {
      case 'no-speech':
        return 'no-speech';
      case 'aborted':
        return 'aborted';
      case 'audio-capture':
        return 'audio-capture';
      case 'network':
        return 'network';
      case 'not-allowed':
        return 'not-allowed';
      case 'service-not-allowed':
        return 'service-not-allowed';
      case 'bad-grammar':
        return 'bad-grammar';
      case 'language-not-supported':
        return 'language-not-supported';
      default:
        return 'unknown';
    }
  }

  private getErrorMessage(code: SpeechErrorCode): string {
    switch (code) {
      case 'no-speech':
        return 'No speech was detected. Please try again.';
      case 'aborted':
        return 'Speech input was aborted.';
      case 'audio-capture':
        return 'No microphone was found or audio capture failed.';
      case 'network':
        return 'Network communication error occurred.';
      case 'not-allowed':
        return 'Permission to use the microphone was denied.';
      case 'service-not-allowed':
        return 'Speech recognition service is not allowed.';
      case 'bad-grammar':
        return 'Grammar error in speech recognition.';
      case 'language-not-supported':
        return 'The selected language is not supported.';
      case 'not-supported':
        return 'Speech recognition is not supported in this browser.';
      default:
        return 'An unknown error occurred during speech recognition.';
    }
  }

  private emitError(code: SpeechErrorCode, message: string): void {
    this.stateSubject.next({
      status: 'error',
      error: code,
      errorMessage: message
    });
  }

  private getBrowserLanguageCode(lang: string): string {
    if (lang === 'gu-IN-hybrid') {
      return 'gu-IN';
    }
    if (lang === 'hi-IN-hybrid') {
      return 'hi-IN';
    }
    return lang;
  }
}
