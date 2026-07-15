import { TestBed } from '@angular/core/testing';
import { ProductRepository } from './product';
import { DatabaseService } from '../database';

describe('ProductRepository', () => {
  let repository: ProductRepository;
  let mockDbService: any;

  beforeEach(() => {
    mockDbService = {
      run: vi.fn().mockResolvedValue({ changes: 1, lastId: 10 }),
      query: vi.fn().mockResolvedValue([]),
      runTransaction: vi.fn().mockImplementation(async (actions) => {
        await actions();
      })
    };

    TestBed.configureTestingModule({
      providers: [
        ProductRepository,
        { provide: DatabaseService, useValue: mockDbService }
      ]
    });

    repository = TestBed.inject(ProductRepository);
  });

  it('should insert product and variant in transaction', async () => {
    const product = {
      SKU: 'TEST-SKU',
      CategoryId: 1,
      DisplayName: 'Test Pipe',
      GST: 18.0,
      SellingPrice: 100.0,
      Unit: 'Mtr',
      IsActive: 1,
      CreatedAt: 'now'
    };

    const id = await repository.insert(product, []);

    expect(mockDbService.runTransaction).toHaveBeenCalled();
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO Product'),
      expect.any(Array)
    );
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ProductVariant'),
      expect.any(Array)
    );
    expect(id).toBe(10);
  });

  it('should update variant in transaction', async () => {
    const product = {
      Id: 1,
      SKU: 'TEST-SKU',
      CategoryId: 1,
      DisplayName: 'Test Pipe Mdf',
      GST: 18.0,
      SellingPrice: 120.0,
      Unit: 'Mtr',
      IsActive: 1,
      CreatedAt: 'now'
    };

    await repository.update(product);

    expect(mockDbService.runTransaction).toHaveBeenCalled();
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE ProductVariant SET'),
      expect.any(Array)
    );
  });

  it('should get product with attribute value display mappings', async () => {
    mockDbService.query.mockResolvedValueOnce([
      {
        Id: 1,
        SKU: 'TEST-SKU',
        CategoryId: 1,
        BrandName: 'Supreme',
        CategoryName: 'Plumbing',
        ProductName: 'Test Pipe',
        sizeMm: 20,
        sizeInch: '1/2"',
        GST: 18,
        SellingPrice: 100,
        Unit: 'Mtr',
        IsActive: 1,
        CreatedAt: 'now'
      }
    ]);
    mockDbService.query.mockResolvedValueOnce([
      {
        id: 1,
        productId: 1,
        sku: 'TEST-SKU',
        sizeMm: 20,
        sizeInch: '1/2"',
        purchasePrice: 80,
        sellingPrice: 100
      }
    ]);

    const result = await repository.getProductWithAttributes(1);

    expect(result).toBeTruthy();
    expect(result!.product.SKU).toBe('TEST-SKU');
    expect(result!.attributes).toContainEqual({ attributeName: 'Size (mm)', displayValue: '20mm' });
    expect(result!.attributes).toContainEqual({ attributeName: 'Size (inch)', displayValue: '1/2"' });
  });
});
