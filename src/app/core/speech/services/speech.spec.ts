import { TestBed } from '@angular/core/testing';
import { SpeechService } from './speech';
import { SPEECH_PROVIDER } from '../providers/speech-provider.token';
import { Subject } from 'rxjs';
import { SpeechState } from '../models/speech-state.model';

describe('SpeechService', () => {
  let service: SpeechService;
  let mockProvider: any;
  let providerState$: Subject<Partial<SpeechState>>;

  beforeEach(() => {
    providerState$ = new Subject<Partial<SpeechState>>();

    mockProvider = {
      initialize: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      abort: vi.fn(),
      setLanguage: vi.fn(),
      isSupported: vi.fn().mockReturnValue(true),
      state$: providerState$.asObservable(),
    };

    TestBed.configureTestingModule({
      providers: [
        SpeechService,
        { provide: SPEECH_PROVIDER, useValue: mockProvider }
      ]
    });

    service = TestBed.inject(SpeechService);
  });

  it('should be created and initialize the provider', () => {
    expect(service).toBeTruthy();
    expect(mockProvider.initialize).toHaveBeenCalled();
  });

  it('should expose the default initial state', () => {
    const state = service.state();
    expect(state.status).toBe('idle');
    expect(state.transcript).toBe('');
    expect(state.finalTranscript).toBe('');
    expect(state.confidence).toBe(0);
    expect(state.language).toBe('en-US');
    expect(state.error).toBeNull();
  });

  it('should update state signal when provider emits changes', () => {
    providerState$.next({ status: 'listening', transcript: 'Hello' });

    const state = service.state();
    expect(state.status).toBe('listening');
    expect(state.transcript).toBe('Hello');
  });

  it('should delegate action methods to provider', () => {
    service.start();
    expect(mockProvider.start).toHaveBeenCalled();

    service.stop();
    expect(mockProvider.stop).toHaveBeenCalled();

    service.abort();
    expect(mockProvider.abort).toHaveBeenCalled();

    service.setLanguage('es-ES');
    expect(mockProvider.setLanguage).toHaveBeenCalledWith('es-ES');

    service.isSupported();
    expect(mockProvider.isSupported).toHaveBeenCalled();
  });

  it('should reset state while keeping the current language configuration', () => {
    // Set a custom language and some transcripts first
    providerState$.next({ language: 'fr-FR', transcript: 'Bonjour', status: 'listening' });
    expect(service.state().language).toBe('fr-FR');
    expect(service.state().transcript).toBe('Bonjour');

    service.reset();

    expect(mockProvider.abort).toHaveBeenCalled();
    const state = service.state();
    expect(state.status).toBe('idle');
    expect(state.transcript).toBe('');
    expect(state.finalTranscript).toBe('');
    expect(state.language).toBe('fr-FR'); // Preserved!
  });
});
