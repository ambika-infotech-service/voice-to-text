import { TestBed } from '@angular/core/testing';
import { BrowserSpeechProvider } from './browser-speech-provider';
import { firstValueFrom, take } from 'rxjs';

// Mock class matching the ISpeechRecognition interface
class MockSpeechRecognition {
  public continuous = false;
  public interimResults = false;
  public lang = '';
  public maxAlternatives = 0;
  public onstart: (() => void) | null = null;
  public onresult: ((event: any) => void) | null = null;
  public onerror: ((event: any) => void) | null = null;
  public onend: (() => void) | null = null;

  public start = vi.fn();
  public stop = vi.fn();
  public abort = vi.fn();

  constructor() {
    activeMockInstance = this;
    constructorSpy();
  }
}

let activeMockInstance: MockSpeechRecognition | null = null;
const constructorSpy = vi.fn();

describe('BrowserSpeechProvider', () => {
  let provider: BrowserSpeechProvider;
  let originalSpeechRecognition: any;
  let originalWebkitSpeechRecognition: any;

  beforeEach(() => {
    originalSpeechRecognition = window.SpeechRecognition;
    originalWebkitSpeechRecognition = window.webkitSpeechRecognition;

    activeMockInstance = null;
    constructorSpy.mockClear();

    // Assign mock constructor to window
    (window as any).SpeechRecognition = MockSpeechRecognition;
    delete (window as any).webkitSpeechRecognition;

    TestBed.configureTestingModule({
      providers: [BrowserSpeechProvider]
    });

    provider = TestBed.inject(BrowserSpeechProvider);
  });

  afterEach(() => {
    window.SpeechRecognition = originalSpeechRecognition;
    window.webkitSpeechRecognition = originalWebkitSpeechRecognition;
  });

  it('should be created', () => {
    expect(provider).toBeTruthy();
  });

  it('should return true for isSupported if window.SpeechRecognition exists', () => {
    expect(provider.isSupported()).toBe(true);
  });

  it('should return false for isSupported if no SpeechRecognition constructor exists', () => {
    delete (window as any).SpeechRecognition;
    expect(provider.isSupported()).toBe(false);
  });

  it('should initialize and configure SpeechRecognition constructor on start', () => {
    provider.start();

    expect(constructorSpy).toHaveBeenCalled();
    expect(activeMockInstance).toBeTruthy();
    expect(activeMockInstance!.continuous).toBe(true);
    expect(activeMockInstance!.interimResults).toBe(true);
    expect(activeMockInstance!.maxAlternatives).toBe(1);
    expect(activeMockInstance!.start).toHaveBeenCalled();
  });

  it('should update status onstart event', async () => {
    provider.start();
    const statePromise = firstValueFrom(provider.state$.pipe(take(1)));

    expect(activeMockInstance).toBeTruthy();
    if (activeMockInstance?.onstart) {
      activeMockInstance.onstart();
    }

    const update = await statePromise;
    expect(update.status).toBe('listening');
    expect(update.error).toBeNull();
  });

  it('should update transcripts and confidence onresult event', async () => {
    provider.start();
    const statePromise = firstValueFrom(provider.state$.pipe(take(1)));

    const mockEvent = {
      resultIndex: 0,
      results: [
        {
          isFinal: true,
          length: 1,
          0: { transcript: 'Hello', confidence: 0.9 }
        },
        {
          isFinal: false,
          length: 1,
          0: { transcript: ' world', confidence: 0 }
        }
      ]
    } as any;

    expect(activeMockInstance).toBeTruthy();
    if (activeMockInstance?.onresult) {
      activeMockInstance.onresult(mockEvent);
    }

    const update = await statePromise;
    expect(update.transcript).toBe('Hello world');
    expect(update.finalTranscript).toBe('Hello');
    expect(update.confidence).toBe(0.9);
  });

  it('should map errors correctly onerror event', async () => {
    provider.start();
    const statePromise = firstValueFrom(provider.state$.pipe(take(1)));

    expect(activeMockInstance).toBeTruthy();
    if (activeMockInstance?.onerror) {
      activeMockInstance.onerror({ error: 'not-allowed' });
    }

    const update = await statePromise;
    expect(update.status).toBe('error');
    expect(update.error).toBe('not-allowed');
    expect(update.errorMessage).toContain('Permission');
  });

  it('should transit status to idle onend event', async () => {
    provider.start();
    const statePromise = firstValueFrom(provider.state$.pipe(take(1)));

    expect(activeMockInstance).toBeTruthy();
    if (activeMockInstance?.onend) {
      activeMockInstance.onend();
    }

    const update = await statePromise;
    expect(update.status).toBe('idle');
  });

  it('should change language on recognition object if initialized', () => {
    provider.start();
    provider.setLanguage('es-ES');
    expect(activeMockInstance!.lang).toBe('es-ES');
  });

  it('should map hybrid languages to standard BCP-47 tags on recognition object', () => {
    provider.start();

    provider.setLanguage('gu-IN-hybrid');
    expect(activeMockInstance!.lang).toBe('gu-IN');

    provider.setLanguage('hi-IN-hybrid');
    expect(activeMockInstance!.lang).toBe('hi-IN');
  });
});
