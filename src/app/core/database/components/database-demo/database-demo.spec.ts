import { TestBed, ComponentFixture } from '@angular/core/testing';
import { DatabaseDemo } from './database-demo';
import { DatabaseService } from '../../database';
import { CategoryRepository } from '../../repositories/category';
import { ProductRepository } from '../../repositories/product';
import { AttributeRepository } from '../../repositories/attribute';
import { AliasRepository } from '../../repositories/alias';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('DatabaseDemoComponent', () => {
  let component: DatabaseDemo;
  let fixture: ComponentFixture<DatabaseDemo>;
  let mockDbService: any;
  let mockCategoryRepo: any;
  let mockProductRepo: any;
  let mockAttributeRepo: any;
  let mockAliasRepo: any;

  beforeEach(async () => {
    mockDbService = {
      query: vi.fn().mockResolvedValue([]),
      run: vi.fn().mockResolvedValue({ changes: 1, lastId: 1 })
    };

    mockCategoryRepo = {
      getAll: vi.fn().mockResolvedValue([{ Id: 1, Name: 'Plumbing', IsActive: 1, CreatedAt: 'now' }])
    };

    mockProductRepo = {
      getAll: vi.fn().mockResolvedValue([]),
      getProductWithAttributes: vi.fn().mockResolvedValue(null)
    };

    mockAttributeRepo = {
      getAll: vi.fn().mockResolvedValue([]),
      getAttributeValues: vi.fn().mockResolvedValue([])
    };

    mockAliasRepo = {
      getAll: vi.fn().mockResolvedValue([])
    };

    await TestBed.configureTestingModule({
      imports: [DatabaseDemo],
      providers: [
        { provide: DatabaseService, useValue: mockDbService },
        { provide: CategoryRepository, useValue: mockCategoryRepo },
        { provide: ProductRepository, useValue: mockProductRepo },
        { provide: AttributeRepository, useValue: mockAttributeRepo },
        { provide: AliasRepository, useValue: mockAliasRepo }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DatabaseDemo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should switch tabs correctly', () => {
    expect(component['activeCrudTab']()).toBe('products');

    // Click Category tab button
    const tabs = fixture.debugElement.queryAll(By.css('.nav-link'));
    const categoryTabBtn = tabs.find(tab => tab.nativeElement.textContent.trim() === 'Categories');
    
    expect(categoryTabBtn).toBeTruthy();
    categoryTabBtn!.nativeElement.click();
    fixture.detectChanges();

    expect(component['activeCrudTab']()).toBe('categories');
  });

  it('should load categories list on init', () => {
    expect(mockCategoryRepo.getAll).toHaveBeenCalled();
    expect(component['categories']()).toEqual([{ Id: 1, Name: 'Plumbing', IsActive: 1, CreatedAt: 'now' }]);
  });
});
