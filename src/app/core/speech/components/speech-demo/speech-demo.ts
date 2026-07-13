import { Component, computed, inject } from '@angular/core';
import { SpeechService } from '../../services/speech';

/**
 * Demo component demonstrating the Speech Recognition Module capabilities.
 * Incorporates Bootstrap layout and uses Angular computed signals for state display.
 */
@Component({
  selector: 'app-speech-demo',
  imports: [],
  templateUrl: './speech-demo.html',
  styleUrl: './speech-demo.scss',
})
export class SpeechDemo {
  private readonly speechService = inject(SpeechService);

  /** Exposes the current speech state signal. */
  public readonly speechState = this.speechService.state;

  /** Checks if speech recognition is supported in the current environment. */
  public readonly isSupported = this.speechService.isSupported();

  /** Derived state: maps the current status to a Bootstrap badge class. */
  public readonly statusBadgeClass = computed(() => {
    switch (this.speechState().status) {
      case 'listening':
        return 'bg-success';
      case 'processing':
        return 'bg-warning text-dark';
      case 'error':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  });

  /** Derived state: formats the confidence score as a percentage. */
  public readonly confidencePercentage = computed(() => {
    return Math.round(this.speechState().confidence * 100);
  });

  /** Supported languages for speech recognition demo. */
  public readonly languages = [
    { code: 'en-US', label: 'English' },
    { code: 'gu-IN', label: 'Gujarati (ગુજરાતી)' },
    { code: 'hi-IN', label: 'Hindi (हिन्दी)' },
    { code: 'gu-IN-hybrid', label: 'English-Gujarati' },
    { code: 'hi-IN-hybrid', label: 'Hinglish' }
  ];

  /** Starts recording. */
  public start(): void {
    this.speechService.start();
  }

  /** Stops recording and processes remaining audio. */
  public stop(): void {
    this.speechService.stop();
  }

  /** Resets transcripts and state. */
  public reset(): void {
    this.speechService.reset();
  }

  /**
   * Changes language configuration.
   * @param event The select change event.
   */
  public changeLanguage(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select) {
      this.speechService.setLanguage(select.value);
    }
  }
}
