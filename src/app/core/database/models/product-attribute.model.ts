/**
 * Junction structure linking products to their concrete attribute values.
 */
export interface ProductAttribute {
  /** Foreign key mapping to Product.Id. */
  readonly ProductId: number;
  /** Foreign key mapping to AttributeValue.Id. */
  readonly AttributeValueId: number;
}
