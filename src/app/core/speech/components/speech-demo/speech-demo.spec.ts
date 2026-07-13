import { TestBed, ComponentFixture } from '@angular/core/testing';
import { SpeechDemo } from './speech-demo';
import { SpeechService } from '../../services/speech';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('SpeechDemoComponent', () => {
  let component: SpeechDemo;
  let fixture: ComponentFixture<SpeechDemo>;
  let mockSpeechService: any;
  let mockStateSignal: any;

  beforeEach(async () => {
    mockStateSignal = signal({
      status: 'idle',
      transcript: '',
      finalTranscript: '',
      confidence: 0,
      language: 'en-US',
      error: null,
      errorMessage: null
    });

    mockSpeechService = {
      state: mockStateSignal,
      isSupported: vi.fn().mockReturnValue(true),
      start: vi.fn(),
      stop: vi.fn(),
      reset: vi.fn(),
      setLanguage: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SpeechDemo],
      providers: [
        { provide: SpeechService, useValue: mockSpeechService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SpeechDemo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should display non-supported alert if browser is not supported', () => {
    mockSpeechService.isSupported.mockReturnValue(false);
    const customFixture = TestBed.createComponent(SpeechDemo);
    customFixture.detectChanges();

    const alert = customFixture.debugElement.query(By.css('.alert-danger'));
    expect(alert).toBeTruthy();
    expect(alert.nativeElement.textContent).toContain('Browser Not Supported');
  });

  it('should format confidence percentage correctly', () => {
    mockStateSignal.set({
      ...mockStateSignal(),
      confidence: 0.856
    });
    fixture.detectChanges();

    expect(component.confidencePercentage()).toBe(86);
  });

  it('should enable/disable buttons according to status', () => {
    // When status is idle, start is enabled, stop is disabled
    mockStateSignal.set({
      ...mockStateSignal(),
      status: 'idle'
    });
    fixture.detectChanges();

    const startBtn = fixture.debugElement.query(By.css('#btnStart')).nativeElement;
    const stopBtn = fixture.debugElement.query(By.css('#btnStop')).nativeElement;

    expect(startBtn.disabled).toBe(false);
    expect(stopBtn.disabled).toBe(true);

    // When status is listening, start is disabled, stop is enabled
    mockStateSignal.set({
      ...mockStateSignal(),
      status: 'listening'
    });
    fixture.detectChanges();

    expect(startBtn.disabled).toBe(true);
    expect(stopBtn.disabled).toBe(false);
  });

  it('should call service actions on button clicks', () => {
    // Click Start
    const startBtn = fixture.debugElement.query(By.css('#btnStart')).nativeElement;
    startBtn.click();
    expect(mockSpeechService.start).toHaveBeenCalled();

    // Set listening to enable stop button
    mockStateSignal.set({
      ...mockStateSignal(),
      status: 'listening'
    });
    fixture.detectChanges();

    // Click Stop
    const stopBtn = fixture.debugElement.query(By.css('#btnStop')).nativeElement;
    stopBtn.click();
    expect(mockSpeechService.stop).toHaveBeenCalled();

    // Click Reset
    const resetBtn = fixture.debugElement.query(By.css('#btnReset')).nativeElement;
    resetBtn.click();
    expect(mockSpeechService.reset).toHaveBeenCalled();
  });
});
