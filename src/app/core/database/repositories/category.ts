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
   * @returns The generated database id.
   */
  public async insert(category: Category): Promise<number> {
    const sql = `INSERT INTO Category (name, displayOrder, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?);`;
    const now = new Date().toISOString();
    const res = await this.db.run(sql, [
      category.name,
      category.displayOrder || 0,
      category.isActive,
      category.createdAt || now,
      now
    ]);
    return res.lastId ?? -1;
  }

  /**
   * Updates an existing category.
   * @param category The Category object containing updated properties.
   */
  public async update(category: Category): Promise<void> {
    if (category.id === undefined) {
      throw new Error('Category id must be defined for updates.');
    }
    const sql = `UPDATE Category SET name = ?, isActive = ?, updatedAt = ? WHERE id = ?;`;
    const now = new Date().toISOString();
    await this.db.run(sql, [category.name, category.isActive, now, category.id]);
  }

  /**
   * Deletes a category by its unique id.
   * @param id The category id.
   */
  public async delete(id: number): Promise<void> {
    const sql = `DELETE FROM Category WHERE id = ?;`;
    await this.db.run(sql, [id]);
  }

  /**
   * Retrieves a single category by id.
   * @param id The category id.
   */
  public async getById(id: number): Promise<Category | null> {
    const sql = `SELECT * FROM Category WHERE id = ? LIMIT 1;`;
    const rows = await this.db.query<Category>(sql, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Retrieves all categories ordered by name.
   */
  public async getAll(): Promise<Category[]> {
    const sql = `SELECT * FROM Category ORDER BY name ASC;`;
    return this.db.query<Category>(sql);
  }

  /**
   * Retrieves active categories.
   */
  public async getAllActive(): Promise<Category[]> {
    const sql = `SELECT * FROM Category WHERE isActive = 1 ORDER BY name ASC;`;
    return this.db.query<Category>(sql);
  }
}
