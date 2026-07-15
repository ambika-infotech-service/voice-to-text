/**
 * Represents a product category in the database.
 */
export interface Category {
  /** Unique primary key identifier. */
  readonly id?: number;
  /** Name of the category (e.g., 'Plumbing'). */
  readonly name: string;
  /** Display order order weight. */
  readonly displayOrder?: number;
  /** Active status (1 = Active, 0 = Inactive). */
  readonly isActive: number;
  /** ISO string timestamp when the category was created. */
  readonly createdAt: string;
}
