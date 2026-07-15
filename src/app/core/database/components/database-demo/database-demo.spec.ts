import { TestBed, ComponentFixture } from '@angular/core/testing';
import { DatabaseDemo } from './database-demo';
import { DatabaseService } from '../../database';
import { CategoryRepository } from '../../repositories/category';
import { ProductRepository } from '../../repositories/product';
import { By } from '@angular/platform-browser';

describe('DatabaseDemoComponent', () => {
  let component: DatabaseDemo;
  let fixture: ComponentFixture<DatabaseDemo>;
  let mockDbService: any;
  let mockCategoryRepo: any;
  let mockProductRepo: any;

  beforeEach(async () => {
    mockDbService = {
      query: vi.fn().mockResolvedValue([]),
      run: vi.fn().mockResolvedValue({ changes: 1, lastId: 1 })
    };

    mockCategoryRepo = {
      getAll: vi.fn().mockResolvedValue([{ id: 1, name: 'Plumbing', isActive: 1, createdAt: 'now' }]),
      insert: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined)
    };

    mockProductRepo = {
      getAll: vi.fn().mockResolvedValue([]),
      getProductWithAttributes: vi.fn().mockResolvedValue(null),
      insert: vi.fn().mockResolvedValue(1),
      delete: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [DatabaseDemo],
      providers: [
        { provide: DatabaseService, useValue: mockDbService },
        { provide: CategoryRepository, useValue: mockCategoryRepo },
        { provide: ProductRepository, useValue: mockProductRepo }
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

    const tabs = fixture.debugElement.queryAll(By.css('.nav-link'));
    const categoryTabBtn = tabs.find(tab => tab.nativeElement.textContent.trim() === 'Categories');
    
    expect(categoryTabBtn).toBeTruthy();
    categoryTabBtn!.nativeElement.click();
    fixture.detectChanges();

    expect(component['activeCrudTab']()).toBe('categories');
  });

  it('should load categories list on init', () => {
    expect(mockCategoryRepo.getAll).toHaveBeenCalled();
    expect(component['categories']()).toEqual([{ id: 1, name: 'Plumbing', isActive: 1, createdAt: 'now' }]);
  });

  it('should populate edit form and activate edit mode when startEditProduct is called', async () => {
    mockProductRepo.update = vi.fn().mockResolvedValue(undefined);

    const testProd = {
      Id: 10,
      SKU: 'TEST-SKU-1',
      CategoryId: 2,
      DisplayName: 'Test Product Name',
      Barcode: '999999',
      HSNCode: '1111',
      GST: 18.0,
      SellingPrice: 500,
      Unit: 'meter',
      IsActive: 1,
      CreatedAt: 'then'
    };

    await component['startEditProduct'](testProd);

    expect(component['isEditingProduct']()).toBe(true);
    expect(component['editProductForm'].value).toEqual({
      id: 10,
      sku: 'TEST-SKU-1',
      categoryId: 2,
      displayName: 'Test Product Name',
      barcode: '999999',
      hsnCode: '1111',
      gst: 18.0,
      sellingPrice: 500,
      unit: 'meter'
    });

    await component['updateProduct']();
    expect(mockProductRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        Id: 10,
        SKU: 'TEST-SKU-1',
        Unit: 'meter'
      })
    );
    expect(component['isEditingProduct']()).toBe(false);
  });

  it('should populate edit category form and call update repository method on save', async () => {
    mockCategoryRepo.update = vi.fn().mockResolvedValue(undefined);

    const testCat = {
      id: 5,
      name: 'Paints',
      isActive: 1,
      createdAt: 'then'
    };

    component['startEditCategory'](testCat);

    expect(component['isEditingCategory']()).toBe(true);
    expect(component['editCategoryForm'].value).toEqual({
      id: 5,
      name: 'Paints'
    });

    await component['updateCategory']();

    expect(mockCategoryRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 5,
        name: 'Paints'
      })
    );
    expect(component['isEditingCategory']()).toBe(false);
  });

  it('should filter product list based on search query and brand/category/subcategory filters', () => {
    const list = [
      { SKU: 'PR-1', DisplayName: 'Prince Tee', CategoryId: 1, BrandId: 10, SubCategoryId: 20 },
      { SKU: 'AS-1', DisplayName: 'Astral Elbow', CategoryId: 2, BrandId: 11, SubCategoryId: 21 }
    ] as any[];
    component['products'].set(list);

    expect(component['filteredProducts']().length).toBe(2);

    // Search by Category filter
    component['selectedCategoryFilter'].set('1');
    expect(component['filteredProducts']()).toEqual([list[0]]);
    component['selectedCategoryFilter'].set('');

    // Search by Brand filter
    component['selectedBrandFilter'].set('11');
    expect(component['filteredProducts']()).toEqual([list[1]]);
    component['selectedBrandFilter'].set('');

    // Search by SubCategory filter
    component['selectedSubCategoryFilter'].set('20');
    expect(component['filteredProducts']()).toEqual([list[0]]);
    component['selectedSubCategoryFilter'].set('');

    // Search by SKU
    component['productSearchQuery'].set('PR-1');
    expect(component['filteredProducts']()).toEqual([list[0]]);

    // Search by DisplayName
    component['productSearchQuery'].set('elbow');
    expect(component['filteredProducts']()).toEqual([list[1]]);

    // Non-matching query
    component['productSearchQuery'].set('xyz');
    expect(component['filteredProducts']().length).toBe(0);
  });
});
