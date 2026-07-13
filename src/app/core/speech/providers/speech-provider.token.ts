import { InjectionToken, inject } from '@angular/core';
import { SpeechProvider } from './speech-provider.interface';
import { BrowserSpeechProvider } from './browser-speech-provider';

/**
 * Injection token for dynamically injecting a SpeechProvider implementation.
 * Defaults to BrowserSpeechProvider for ease of use.
 */
export const SPEECH_PROVIDER = new InjectionToken<SpeechProvider>('SpeechProvider', {
  providedIn: 'root',
  factory: () => inject(BrowserSpeechProvider)
});
