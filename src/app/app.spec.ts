import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { DatabaseService } from './core/database/database';

describe('App', () => {
  let mockDbService: any;

  beforeEach(async () => {
    mockDbService = {
      initialize: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      run: vi.fn().mockResolvedValue({ changes: 1, lastId: 1 })
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: DatabaseService, useValue: mockDbService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the speech demo component or wrapper', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges(); // Run ngOnInit to load DB status

    await fixture.whenStable();
    fixture.detectChanges(); // Redraw template after async tasks finish
    const compiled = fixture.nativeElement as HTMLElement;
    
    // With isDbReady set to true in ngOnInit on successful init,
    // the layout should render the toggle buttons and app-billing-page by default
    expect(compiled.querySelector('app-billing-page')).toBeTruthy();
  });
});
