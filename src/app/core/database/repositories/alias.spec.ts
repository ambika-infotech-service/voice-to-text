import { TestBed } from '@angular/core/testing';
import { AliasRepository } from './alias';
import { DatabaseService } from '../database';

describe('AliasRepository', () => {
  let repository: AliasRepository;
  let mockDbService: any;

  beforeEach(() => {
    mockDbService = {
      run: vi.fn().mockResolvedValue({ changes: 1, lastId: 3 }),
      query: vi.fn().mockResolvedValue([])
    };

    TestBed.configureTestingModule({
      providers: [
        AliasRepository,
        { provide: DatabaseService, useValue: mockDbService }
      ]
    });

    repository = TestBed.inject(AliasRepository);
  });

  it('should insert keyword alias', async () => {
    const id = await repository.insert({ AttributeValueId: 7, Keyword: '1 inch' });
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO Alias'),
      [7, '1 inch']
    );
    expect(id).toBe(3);
  });

  it('should query aliases by case-insensitive keyword matches', async () => {
    mockDbService.query.mockResolvedValueOnce([
      { Id: 1, AttributeValueId: 7, Keyword: '1 Inch' }
    ]);

    const results = await repository.findByKeyword('1 inch');

    expect(mockDbService.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM Alias WHERE LOWER(Keyword) = LOWER(?)'),
      ['1 inch']
    );
    expect(results.length).toBe(1);
    expect(results[0].Keyword).toBe('1 Inch');
  });

  it('should resolve full attribute metadata mappings by keyword alias', async () => {
    mockDbService.query.mockResolvedValueOnce([
      { attributeValueId: 7, keyword: '1 inch', displayValue: '1"', attributeName: 'Size' }
    ]);

    const res = await repository.getMappedAttributeValue('1 inch');

    expect(res).toBeTruthy();
    expect(res!.attributeName).toBe('Size');
    expect(res!.displayValue).toBe('1"');
  });
});
