/**
 * Represents a supplier or category price list.
 */
export interface PriceList {
  readonly id?: number;
  readonly name: string;
  readonly supplierName?: string | null;
  readonly effectiveDate: string;
  readonly expiryDate?: string | null;
  readonly isActive?: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}
