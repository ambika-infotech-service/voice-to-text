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

  it('should insert product and map attributes in transaction', async () => {
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

    const id = await repository.insert(product, [2, 3]);

    expect(mockDbService.runTransaction).toHaveBeenCalled();
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO Product'),
      expect.any(Array)
    );
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ProductAttribute'),
      [10, 2]
    );
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ProductAttribute'),
      [10, 3]
    );
    expect(id).toBe(10);
  });

  it('should update product and replace attributes in transaction', async () => {
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

    await repository.update(product, [4]);

    expect(mockDbService.runTransaction).toHaveBeenCalled();
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Product SET SKU = ?'),
      expect.any(Array)
    );
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM ProductAttribute'),
      [1]
    );
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ProductAttribute'),
      [1, 4]
    );
  });

  it('should get product with attribute value display mappings', async () => {
    mockDbService.query.mockResolvedValueOnce([
      { Id: 1, SKU: 'TEST-SKU', CategoryId: 1, DisplayName: 'Test Pipe' }
    ]);
    mockDbService.query.mockResolvedValueOnce([
      { attributeName: 'Brand', displayValue: 'Supreme' }
    ]);

    const result = await repository.getProductWithAttributes(1);

    expect(result).toBeTruthy();
    expect(result!.product.SKU).toBe('TEST-SKU');
    expect(result!.attributes).toEqual([{ attributeName: 'Brand', displayValue: 'Supreme' }]);
  });
});
