/**
 * Represents a specific variant/SKU of a product.
 */
export interface ProductVariant {
  readonly id?: number;
  readonly productId: number;
  readonly sku: string;
  readonly sizeMm?: number | null;
  readonly sizeInch?: string | null;
  readonly weightKg?: number | null;
  readonly pressure?: string | null;
  readonly schedule?: string | null;
  readonly pipeLength?: number | null;
  readonly capacity?: string | null;
  readonly color?: string | null;
  readonly extraSpecification?: string | null;
  readonly purchasePrice?: number;
  readonly sellingPrice?: number;
  readonly stock?: number;
  readonly minStock?: number;
  readonly barcode?: string | null;
  readonly isActive?: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}
