/**
 * Represents the normalized Product table structure in SQLite.
 */
export interface DbProduct {
  readonly id?: number;
  readonly brandId: number;
  readonly categoryId: number;
  readonly subCategoryId?: number | null;
  readonly productCode?: string | null;
  readonly name: string;
  readonly description?: string | null;
  readonly unit: string; // PCS, MTR, LTR, KG, BOX, SET
  readonly priceCalculationType: string; // DIRECT_PRICE, FORMULA
  readonly searchKeywords?: string | null;
  readonly normalizedSearchText?: string | null;
  readonly isActive: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Represents the flattened product variant that the billing and search UI expects.
 * Conforms to the original Product interface to avoid cascading UI type errors.
 */
export interface Product {
  /** Variant primary key identifier. */
  readonly Id?: number;
  /** Stock Keeping Unit (unique code). */
  readonly SKU: string;
  /** Foreign key mapping to Category.Id. */
  readonly CategoryId: number;
  /** Text display name of the variant product (e.g. 'Prince PVC Pipe 20mm 6kg'). */
  readonly DisplayName: string;
  /** Optional barcode value. */
  readonly Barcode?: string | null;
  /** Optional HSN Code for GST billing. */
  readonly HSNCode?: string | null;
  /** Goods and Services Tax percentage (e.g. 18.0). */
  readonly GST: number;
  /** Calculated or direct selling price value. */
  readonly SellingPrice: number;
  /** Measuring unit designation (e.g. 'Pcs', 'Mtr'). */
  readonly Unit: string;
  /** Active status (1 = Active, 0 = Inactive). */
  readonly IsActive: number;
  /** ISO string timestamp when the product was created. */
  readonly CreatedAt: string;
  
  // Resolved join metadata fields used by Search service and UI scoring
  readonly BrandName?: string;
  readonly CategoryName?: string;
  readonly SubCategoryName?: string;
  readonly BrandId?: number;
  readonly SubCategoryId?: number | null;
  readonly NormalizedSearchText?: string;
}
