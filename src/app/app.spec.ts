import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { DatabaseService } from './core/database/database';
import { provideRouter, Router } from '@angular/router';
import { routes } from './app.routes';

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
        { provide: DatabaseService, useValue: mockDbService },
        provideRouter(routes)
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the billing page component by default route', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    
    router.initialNavigation();
    fixture.detectChanges(); // Run ngOnInit to load DB status

    await fixture.whenStable();
    fixture.detectChanges(); // Redraw template after async tasks finish
    const compiled = fixture.nativeElement as HTMLElement;
    
    // With isDbReady set to true, the router should load the default '/billing' route rendering app-billing-page
    expect(compiled.querySelector('app-billing-page')).toBeTruthy();
  });
});
