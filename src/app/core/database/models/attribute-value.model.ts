/**
 * Represents a value option associated with a specific Attribute.
 */
export interface AttributeValue {
  /** Unique primary key identifier. */
  readonly Id?: number;
  /** Foreign key mapping to Attribute.Id. */
  readonly AttributeId: number;
  /** Display value for users (e.g., '1 Inch'). */
  readonly DisplayValue: string;
  /** Normalized lowercase string for matching algorithms (e.g., '1 inch'). */
  readonly NormalizedValue: string;
}
