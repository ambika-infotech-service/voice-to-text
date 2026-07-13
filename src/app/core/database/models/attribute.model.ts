/**
 * Represents a product attribute definition (e.g. 'Brand', 'Size').
 */
export interface Attribute {
  /** Unique primary key identifier. */
  readonly Id?: number;
  /** Name of the attribute (e.g., 'Brand'). Unique constraint. */
  readonly Name: string;
  /** Data type constraint for values (e.g., 'TEXT', 'NUMBER'). */
  readonly DataType: string;
  /** Active status (1 = Active, 0 = Inactive). */
  readonly IsActive: number;
}
