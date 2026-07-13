/**
 * Standardized error codes for the speech recognition module,
 * abstracting vendor/browser-specific error strings.
 */
export type SpeechErrorCode =
  | 'no-speech'
  | 'aborted'
  | 'audio-capture'
  | 'network'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'bad-grammar'
  | 'language-not-supported'
  | 'not-supported'
  | 'unknown';
