import { Service, inject } from '@angular/core';
import { DatabaseService } from '../database';
import { Category } from '../models/category.model';

/**
 * Repository handling database operations for the Category table.
 */
@Service()
export class CategoryRepository {
  private readonly db = inject(DatabaseService);

  /**
   * Inserts a new category.
   * @param category The Category object to insert.
   * @returns The generated database Id.
   */
  public async insert(category: Category): Promise<number> {
    const sql = `INSERT INTO Category (Name, IsActive, CreatedAt) VALUES (?, ?, ?);`;
    const res = await this.db.run(sql, [category.Name, category.IsActive, category.CreatedAt]);
    return res.lastId ?? -1;
  }

  /**
   * Updates an existing category.
   * @param category The Category object containing updated properties.
   */
  public async update(category: Category): Promise<void> {
    if (category.Id === undefined) {
      throw new Error('Category Id must be defined for updates.');
    }
    const sql = `UPDATE Category SET Name = ?, IsActive = ? WHERE Id = ?;`;
    await this.db.run(sql, [category.Name, category.IsActive, category.Id]);
  }

  /**
   * Deletes a category by its unique Id.
   * @param id The category Id.
   */
  public async delete(id: number): Promise<void> {
    const sql = `DELETE FROM Category WHERE Id = ?;`;
    await this.db.run(sql, [id]);
  }

  /**
   * Retrieves a single category by Id.
   * @param id The category Id.
   */
  public async getById(id: number): Promise<Category | null> {
    const sql = `SELECT * FROM Category WHERE Id = ? LIMIT 1;`;
    const rows = await this.db.query<Category>(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Retrieves all categories ordered by Name.
   */
  public async getAll(): Promise<Category[]> {
    const sql = `SELECT * FROM Category ORDER BY Name ASC;`;
    return this.db.query<Category>(sql);
  }

  /**
   * Retrieves active categories.
   */
  public async getAllActive(): Promise<Category[]> {
    const sql = `SELECT * FROM Category WHERE IsActive = 1 ORDER BY Name ASC;`;
    return this.db.query<Category>(sql);
  }
}
