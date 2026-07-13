/**
 * Represents a product category in the database.
 */
export interface Category {
  /** Unique primary key identifier. */
  readonly Id?: number;
  /** Name of the category (e.g., 'Plumbing'). */
  readonly Name: string;
  /** Active status (1 = Active, 0 = Inactive). */
  readonly IsActive: number;
  /** ISO string timestamp when the category was created. */
  readonly CreatedAt: string;
}
