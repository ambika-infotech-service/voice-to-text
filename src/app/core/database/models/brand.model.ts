/**
 * Represents a product brand in the database.
 */
export interface Brand {
  readonly id?: number;
  readonly name: string;
  readonly isActive?: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}
