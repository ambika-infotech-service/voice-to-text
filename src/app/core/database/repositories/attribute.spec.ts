import { TestBed } from '@angular/core/testing';
import { AttributeRepository } from './attribute';
import { DatabaseService } from '../database';

describe('AttributeRepository', () => {
  let repository: AttributeRepository;
  let mockDbService: any;

  beforeEach(() => {
    mockDbService = {
      run: vi.fn().mockResolvedValue({ changes: 1, lastId: 10 }),
      query: vi.fn().mockResolvedValue([])
    };

    TestBed.configureTestingModule({
      providers: [
        AttributeRepository,
        { provide: DatabaseService, useValue: mockDbService }
      ]
    });

    repository = TestBed.inject(AttributeRepository);
  });

  it('should insert attribute definition', async () => {
    const id = await repository.insertAttribute({ Name: 'Brand', DataType: 'TEXT', IsActive: 1 });
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO Attribute'),
      ['Brand', 'TEXT', 1]
    );
    expect(id).toBe(10);
  });

  it('should insert attribute value option', async () => {
    const id = await repository.insertAttributeValue(1, 'Supreme', 'supreme');
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO AttributeValue'),
      [1, 'Supreme', 'supreme']
    );
    expect(id).toBe(10);
  });

  it('should retrieve resolved attributes with values list', async () => {
    mockDbService.query.mockResolvedValueOnce([
      { Id: 1, Name: 'Brand', DataType: 'TEXT', IsActive: 1 }
    ]);
    mockDbService.query.mockResolvedValueOnce([
      { Id: 10, AttributeId: 1, DisplayValue: 'Supreme', NormalizedValue: 'supreme' }
    ]);

    const res = await repository.getAttributeWithValues(1);

    expect(res).toBeTruthy();
    expect(res!.attribute.Name).toBe('Brand');
    expect(res!.values.length).toBe(1);
    expect(res!.values[0].DisplayValue).toBe('Supreme');
  });
});
