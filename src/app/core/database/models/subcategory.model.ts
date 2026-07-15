/**
 * Represents a product subcategory in the database.
 */
export interface SubCategory {
  readonly id?: number;
  readonly categoryId: number;
  readonly name: string;
  readonly isActive?: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}
