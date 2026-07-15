import { TestBed } from '@angular/core/testing';
import { CategoryRepository } from './category';
import { DatabaseService } from '../database';

describe('CategoryRepository', () => {
  let repository: CategoryRepository;
  let mockDbService: any;

  beforeEach(() => {
    mockDbService = {
      run: vi.fn().mockResolvedValue({ changes: 1, lastId: 5 }),
      query: vi.fn().mockResolvedValue([{ id: 1, name: 'Plumbing', isActive: 1, createdAt: 'now' }])
    };

    TestBed.configureTestingModule({
      providers: [
        CategoryRepository,
        { provide: DatabaseService, useValue: mockDbService }
      ]
    });

    repository = TestBed.inject(CategoryRepository);
  });

  it('should be created', () => {
    expect(repository).toBeTruthy();
  });

  it('should insert category', async () => {
    const id = await repository.insert({ name: 'Plumbing', isActive: 1, createdAt: 'now' });
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO Category'),
      ['Plumbing', 0, 1, 'now', expect.any(String)]
    );
    expect(id).toBe(5);
  });

  it('should update category', async () => {
    await repository.update({ id: 1, name: 'Electrical', isActive: 0, createdAt: 'now' });
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE Category'),
      ['Electrical', 0, expect.any(String), 1]
    );
  });

  it('should delete category', async () => {
    await repository.delete(1);
    expect(mockDbService.run).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM Category WHERE id'),
      [1]
    );
  });

  it('should get category by id', async () => {
    const cat = await repository.getById(1);
    expect(mockDbService.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM Category WHERE id'),
      [1]
    );
    expect(cat).toEqual({ id: 1, name: 'Plumbing', isActive: 1, createdAt: 'now' });
  });

  it('should get all categories', async () => {
    await repository.getAll();
    expect(mockDbService.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT * FROM Category ORDER BY name ASC')
    );
  });
});
