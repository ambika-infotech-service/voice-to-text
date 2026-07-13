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

  it('should populate edit form and activate edit mode when startEditProduct is called', async () => {
    mockDbService.query.mockResolvedValueOnce([{ AttributeValueId: 3 }]);
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
    expect(component['selectedMappingValues']()).toEqual([3]);
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

    // Save/Update action verification
    await component['updateProduct']();
    expect(mockProductRepo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        Id: 10,
        SKU: 'TEST-SKU-1',
        Unit: 'meter'
      }),
      [3]
    );
    expect(component['isEditingProduct']()).toBe(false);
  });

  it('should populate edit category form and call update repository method on save', async () => {
    mockCategoryRepo.update = vi.fn().mockResolvedValue(undefined);

    const testCat = {
      Id: 5,
      Name: 'Paints',
      IsActive: 1,
      CreatedAt: 'then'
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
        Id: 5,
        Name: 'Paints'
      })
    );
    expect(component['isEditingCategory']()).toBe(false);
  });
});
